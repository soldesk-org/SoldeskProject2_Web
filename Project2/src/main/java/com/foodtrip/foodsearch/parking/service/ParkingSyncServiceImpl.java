package com.foodtrip.foodsearch.parking.service;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.parking.client.ParkingDataClient;
import com.foodtrip.foodsearch.parking.client.ParkingDataClient.FacilityRecord;
import com.foodtrip.foodsearch.parking.client.ParkingDataClient.FeeRecord;
import com.foodtrip.foodsearch.parking.dto.ParkingSyncResponseDto;
import com.foodtrip.foodsearch.parking.entity.ParkingLot;
import com.foodtrip.foodsearch.parking.repository.ParkingLotRepository;

// 15(주차장-정보) — 관리자가 수동으로 트리거하는 배치 동기화(001-02 2-1장, 자동 스케줄은 이번 범위 밖).
// 외부 API가 반경 검색을 지원하지 않아 페이지 단위로 전체를 끌어와야 하므로, 한 번에 너무 많이 당기지
// 않도록 maxPages로 상한을 둔다.
//
// 2026-07-27 — 실제 전체 규모(totalCount 176만여 건, 페이지 17,000개 이상)를 라이브로 확인한 뒤
// "전체 다 가져와" 요청으로 maxPages를 그 규모까지 키워서 쓰게 됐다. 그래서 원래 sync() 전체를 감쌌던
// 단일 @Transactional을 페이지 단위 트랜잭션(TransactionTemplate)으로 바꿨다 — 수만 페이지를 한
// 트랜잭션에 몰아넣으면 Hibernate 영속성 컨텍스트가 무한히 커져서 메모리 문제가 생기고, 중간에 실패하면
// 그때까지 처리한 것까지 전부 롤백돼버리기 때문(페이지 단위 커밋이면 실패해도 그 지점까지는 남는다).
@Service
public class ParkingSyncServiceImpl implements ParkingSyncService {

    private static final Logger log = LoggerFactory.getLogger(ParkingSyncServiceImpl.class);
    private static final int PAGE_SIZE = 100;
    // 진행 상황을 알 수 있게 1000페이지마다 한 번씩 로그를 남긴다(수만 페이지짜리 동기화라 조용히 돌면
    // 살아있는지 알 방법이 없음).
    private static final int LOG_EVERY_N_PAGES = 1000;
    // 한 페이지 조회가 타임아웃 등으로 실패해도 곧바로 전체 동기화를 포기하지 않고 이만큼 재시도한다
    // (2026-07-27 — 대규모 동기화 중 한 페이지가 일시적으로 타임아웃 나서 수만 페이지짜리 작업 전체가
    // 날아간 걸 실제로 겪은 뒤 추가).
    private static final int MAX_RETRIES_PER_PAGE = 3;

    private final ParkingDataClient parkingDataClient;
    private final ParkingLotRepository parkingLotRepository;
    private final TransactionTemplate transactionTemplate;
    // 관리자 수동 트리거와 "검색했는데 근처에 데이터 없음" 백그라운드 트리거가 동시에 돌면 같은 외부
    // API를 서로 경쟁하듯 두드려서 타임아웃을 서로 유발한다(실제로 겪음) — 트리거 종류와 무관하게 이
    // 서비스 안에서 전체를 통틀어 한 번에 하나만 돌게 막는다.
    private final AtomicBoolean syncRunning = new AtomicBoolean(false);

    public ParkingSyncServiceImpl(ParkingDataClient parkingDataClient, ParkingLotRepository parkingLotRepository,
                                   PlatformTransactionManager transactionManager) {
        this.parkingDataClient = parkingDataClient;
        this.parkingLotRepository = parkingLotRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public ParkingSyncResponseDto sync(int maxPages) {
        if (!parkingDataClient.isConfigured()) {
            throw new CustomException(ErrorCode.PARKING_DATA_SERVICE_UNAVAILABLE);
        }
        if (!syncRunning.compareAndSet(false, true)) {
            throw new CustomException(ErrorCode.PARKING_DATA_SYNC_ALREADY_RUNNING);
        }
        try {
            int facilitySynced = syncFacilities(maxPages);
            int feeSynced = syncFees(maxPages);

            return new ParkingSyncResponseDto(true,
                    "주차장 시설정보 " + facilitySynced + "건, 요금정보 " + feeSynced + "건 동기화 완료", facilitySynced, feeSynced);
        } finally {
            syncRunning.set(false);
        }
    }

    private int syncFacilities(int maxPages) {
        int synced = 0;
        for (int page = 1; page <= maxPages; page++) {
            final int currentPage = page;
            List<FacilityRecord> records = fetchWithRetry(() -> parkingDataClient.fetchFacilityPage(currentPage, PAGE_SIZE));
            if (records.isEmpty()) {
                break;
            }
            int pageSynced = transactionTemplate.execute(status -> {
                int count = 0;
                for (FacilityRecord record : records) {
                    if (record.externalId() == null || record.latitude() == null || record.longitude() == null) {
                        continue; // 좌표 없는 행은 "근처 검색"에 쓸 수 없으니 건너뜀
                    }
                    parkingLotRepository.findBySourceAndExternalId(ParkingLot.SOURCE_DATA_GO_KR, record.externalId())
                            .ifPresentOrElse(
                                    existing -> existing.updateFacility(record.name(), record.address(),
                                            record.latitude(), record.longitude(), record.totalSpaces()),
                                    () -> parkingLotRepository.save(ParkingLot.create(ParkingLot.SOURCE_DATA_GO_KR,
                                            record.externalId(), record.name(), record.address(), record.latitude(),
                                            record.longitude(), record.totalSpaces())));
                    count++;
                }
                return count;
            });
            synced += pageSynced;
            if (page % LOG_EVERY_N_PAGES == 0) {
                log.info("주차장 시설정보 동기화 진행 중: {}페이지, 누적 {}건", page, synced);
            }
            if (records.size() < PAGE_SIZE) {
                break; // 마지막 페이지
            }
        }
        return synced;
    }

    private int syncFees(int maxPages) {
        int synced = 0;
        for (int page = 1; page <= maxPages; page++) {
            final int currentPage = page;
            List<FeeRecord> records = fetchWithRetry(() -> parkingDataClient.fetchOperationPage(currentPage, PAGE_SIZE));
            if (records.isEmpty()) {
                break;
            }
            int pageSynced = transactionTemplate.execute(status -> {
                int count = 0;
                for (FeeRecord record : records) {
                    if (record.externalId() == null) {
                        continue;
                    }
                    parkingLotRepository.findBySourceAndExternalId(ParkingLot.SOURCE_DATA_GO_KR, record.externalId())
                            .ifPresent(lot -> lot.updateFeeInfo(record.baseTimeMinutes(), record.baseFee(),
                                    record.additionalUnitMinutes(), record.additionalUnitFee(), record.dailyFee(),
                                    record.monthlyFee()));
                    count++;
                }
                return count;
            });
            synced += pageSynced;
            if (page % LOG_EVERY_N_PAGES == 0) {
                log.info("주차장 요금정보 동기화 진행 중: {}페이지, 누적 {}건", page, synced);
            }
            if (records.size() < PAGE_SIZE) {
                break;
            }
        }
        return synced;
    }

    private <T> T fetchWithRetry(java.util.function.Supplier<T> fetch) {
        CustomException lastFailure = null;
        for (int attempt = 1; attempt <= MAX_RETRIES_PER_PAGE; attempt++) {
            try {
                return fetch.get();
            } catch (CustomException e) {
                lastFailure = e;
                log.warn("페이지 조회 실패, 재시도 {}/{}: {}", attempt, MAX_RETRIES_PER_PAGE, e.getMessage());
            }
        }
        throw lastFailure;
    }
}
