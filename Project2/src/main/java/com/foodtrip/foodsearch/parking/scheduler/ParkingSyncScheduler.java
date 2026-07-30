package com.foodtrip.foodsearch.parking.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.foodtrip.foodsearch.parking.client.ParkingDataClient;
import com.foodtrip.foodsearch.parking.repository.ParkingLotRepository;
import com.foodtrip.foodsearch.parking.service.ParkingSyncService;

// 15(주차장-정보) 2차 — "관리자 페이지에서 수동으로 하지 말고 자동으로" 요청으로 추가. 기존
// UnverifiedMemberCleanupScheduler(member.cleanup.cron)와 같은 @Scheduled 패턴을 그대로 재사용한다
// (이 프로젝트에 이미 있던 방식이라 새 인프라를 만들지 않음). 관리자 수동 트리거(AdminController의
// POST /api/admin/parking-lots/sync)는 즉시 강제 재동기화가 필요할 때를 위해 그대로 남겨뒀다 — 이제는
// "유일한 방법"이 아니라 "선택적 보조 수단"이 된 것뿐이다.
@Component
public class ParkingSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(ParkingSyncScheduler.class);

    private final ParkingSyncService parkingSyncService;
    private final ParkingDataClient parkingDataClient;
    private final ParkingLotRepository parkingLotRepository;
    private final int syncMaxPages;

    public ParkingSyncScheduler(ParkingSyncService parkingSyncService, ParkingDataClient parkingDataClient,
                                 ParkingLotRepository parkingLotRepository,
                                 @Value("${parking-data.sync-max-pages:50}") int syncMaxPages) {
        this.parkingSyncService = parkingSyncService;
        this.parkingDataClient = parkingDataClient;
        this.parkingLotRepository = parkingLotRepository;
        this.syncMaxPages = syncMaxPages;
    }

    // (2026-07-27 — 서울 열린데이터광장으로 전환하면서 이 전국 단위 자동 동기화는 비활성화. @EventListener
    // 애노테이션을 주석 처리해서 더 이상 자동 실행되지 않는다 — 나중에 되돌릴 경우를 대비해 메서드 자체는
    // 삭제하지 않고 남겨둠.)
    // @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartupIfEmpty() {
        if (!parkingDataClient.isConfigured()) {
            log.info("주차장 정보 서비스키(PARKING_DATA_SERVICE_KEY) 미설정 - 시작 시 자동 동기화 건너뜀");
            return;
        }
        long existing = parkingLotRepository.count(); // TEST_SEED 포함이라도 있으면 "완전히 빈 상태"는 아님
        if (existing > 0) {
            return;
        }
        runSyncSafely("서버 기동");
    }

    // (2026-07-27 — 위와 같은 이유로 비활성화)
    // @Scheduled(cron = "${parking-data.sync-cron:0 0 3 * * *}")
    public void syncDaily() {
        if (!parkingDataClient.isConfigured()) {
            return; // 서비스키 없으면 매번 로그만 남기지 않고 조용히 건너뜀(하루 1번이라도 로그 스팸까진 아니지만, 굳이 매일 경고할 필요는 없음)
        }
        runSyncSafely("일일 정기");
    }

    private void runSyncSafely(String trigger) {
        try {
            var result = parkingSyncService.sync(syncMaxPages);
            log.info("[{}] 주차장 정보 자동 동기화 완료: {}", trigger, result.getMessage());
        } catch (Exception e) {
            // 스케줄러/시작 이벤트에서 예외가 새어나가면 안 됨(서버 기동 자체를 막거나 다른 스케줄에 영향을
            // 주면 안 되므로) - 로그만 남기고 다음 주기에 다시 시도한다.
            log.warn("[{}] 주차장 정보 자동 동기화 실패: {}", trigger, e.getMessage());
        }
    }
}
