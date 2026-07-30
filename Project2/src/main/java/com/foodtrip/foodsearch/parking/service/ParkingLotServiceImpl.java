package com.foodtrip.foodsearch.parking.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.parking.client.SeoulParkingClient;
import com.foodtrip.foodsearch.parking.dto.ParkingLotResponseDto;

// 15(주차장-정보) 2차 전환(2026-07-27) — 서울 열린데이터광장 GetParkInfo로 갈아탐. 검색할 때마다
// SeoulParkingClient.fetchAll()로 서울시 전체(2,189건, 최대 1000건씩 3번)를 실시간으로 가져와, 이 자리에서
// Haversine 거리 계산으로 걸러서 반환한다 — DB 동기화/저장 없음(기존 data.go.kr 기반 DB 방식은 아래
// 주석으로 남겨둠, 나중에 전국 단위가 다시 필요해지면 되돌릴 수 있게).
@Service
public class ParkingLotServiceImpl implements ParkingLotService {

    private static final int DEFAULT_RADIUS_M = 1000;
    private static final int MAX_RADIUS_M = 5000;
    private static final int RESULT_LIMIT = 10;
    private static final double EARTH_RADIUS_M = 6_371_000.0;

    private final SeoulParkingClient seoulParkingClient;

    public ParkingLotServiceImpl(SeoulParkingClient seoulParkingClient) {
        this.seoulParkingClient = seoulParkingClient;
    }

    @Override
    public List<ParkingLotResponseDto> findNearby(BigDecimal latitude, BigDecimal longitude, Integer radiusM) {
        if (!seoulParkingClient.isConfigured()) {
            return List.of();
        }
        int radius = radiusM == null ? DEFAULT_RADIUS_M : Math.min(radiusM, MAX_RADIUS_M);
        double lat0 = latitude.doubleValue();
        double lon0 = longitude.doubleValue();

        List<SeoulParkingClient.ParkingRecord> all = mergeByCode(seoulParkingClient.fetchAll());

        return all.stream()
                .map(record -> toDto(record, haversineMeters(lat0, lon0,
                        record.latitude().doubleValue(), record.longitude().doubleValue())))
                .filter(dto -> dto.getDistanceM() <= radius)
                .sorted(Comparator.comparingLong(ParkingLotResponseDto::getDistanceM))
                .limit(RESULT_LIMIT)
                .toList();
    }

    // 2026-07-27 — 같은 주차장(PKLT_CD)이 개별 주차 칸 단위로 여러 행에 나뉘어 오는 경우가 있다(노상
    // 주차장 다수 — 실측: "영동6교밑 공영주차장"이 칸마다 별도 행 38개, 전부 TPKCT=1). 그대로 보여주면
    // 같은 이름이 목록에 잔뜩 중복돼 보이므로, 같은 코드끼리는 하나로 합치고 총 구획수(TPKCT)를 더한다.
    // 좌표는 그룹의 첫 번째 행 것을 대표값으로 쓴다(같은 시설 안이라 서로 몇 미터 차이라 거리 계산에 영향 없음).
    private List<SeoulParkingClient.ParkingRecord> mergeByCode(List<SeoulParkingClient.ParkingRecord> records) {
        Map<String, List<SeoulParkingClient.ParkingRecord>> byCode = new LinkedHashMap<>();
        for (SeoulParkingClient.ParkingRecord record : records) {
            String key = record.code() != null ? record.code() : (record.name() + "|" + record.address());
            byCode.computeIfAbsent(key, k -> new ArrayList<>()).add(record);
        }
        List<SeoulParkingClient.ParkingRecord> merged = new ArrayList<>();
        for (List<SeoulParkingClient.ParkingRecord> group : byCode.values()) {
            if (group.size() == 1) {
                merged.add(group.get(0));
                continue;
            }
            SeoulParkingClient.ParkingRecord first = group.get(0);
            int totalSpaces = group.stream().mapToInt(r -> r.totalSpaces() != null ? r.totalSpaces() : 0).sum();
            merged.add(new SeoulParkingClient.ParkingRecord(first.code(), first.name(), first.address(),
                    first.latitude(), first.longitude(), totalSpaces, first.paid(), first.baseFee(),
                    first.baseTimeMinutes(), first.additionalUnitFee(), first.additionalUnitMinutes()));
        }
        return merged;
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_M * c;
    }

    private ParkingLotResponseDto toDto(SeoulParkingClient.ParkingRecord record, double distanceM) {
        String feeType;
        String feeSummary = null;
        if (!record.paid()) {
            feeType = "무료";
        } else if (record.baseFee() == null) {
            feeType = "유료";
        } else {
            feeType = "유료";
            StringBuilder sb = new StringBuilder();
            sb.append("기본 ").append(record.baseTimeMinutes()).append("분 ").append(record.baseFee()).append("원");
            if (record.additionalUnitFee() != null && record.additionalUnitMinutes() != null) {
                sb.append(", 추가 ").append(record.additionalUnitMinutes()).append("분당 ")
                        .append(record.additionalUnitFee()).append("원");
            }
            feeSummary = sb.toString();
        }

        Long parkingLotId = parseLongOrNull(record.code());
        return new ParkingLotResponseDto(parkingLotId, record.name(), record.address(), record.latitude(),
                record.longitude(), Math.round(distanceM), record.totalSpaces(), feeType, feeSummary);
    }

    private Long parseLongOrNull(String code) {
        if (code == null) {
            return null;
        }
        try {
            return Long.parseLong(code.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /*
     * (2026-07-27 이전, data.go.kr B553881 기반 — DB 동기화 후 조회하는 방식. 전국 176만여 건(중복 다수)
     * 규모에 반경검색 자체가 불가능해 배치 동기화가 필요했던 구조. 원인불명의 -999 에러까지 겹쳐 서울
     * 열린데이터광장(위 SeoulParkingClient)으로 전환하면서 주석 처리 — 나중에 전국 단위가 다시 필요해지면
     * 아래를 참고해서 되돌릴 수 있다. ParkingSyncService/ParkingDataClient/ParkingSyncScheduler는 삭제하지
     * 않고 그대로 남아있음(스케줄러 트리거만 비활성화, docs/15.주차장-정보 참고).

    private static final int DEFAULT_RADIUS_M = 1000;
    private static final int MAX_RADIUS_M = 5000;
    private static final int RESULT_LIMIT = 10;
    private static final double METERS_PER_DEGREE = 111_000.0;

    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSyncService parkingSyncService;
    private final ParkingDataClient parkingDataClient;
    private final int syncMaxPages;
    private final AtomicBoolean backgroundSyncInProgress = new AtomicBoolean(false);

    public ParkingLotServiceImpl(ParkingLotRepository parkingLotRepository, ParkingSyncService parkingSyncService,
                                  ParkingDataClient parkingDataClient,
                                  @Value("${parking-data.sync-max-pages:50}") int syncMaxPages) {
        this.parkingLotRepository = parkingLotRepository;
        this.parkingSyncService = parkingSyncService;
        this.parkingDataClient = parkingDataClient;
        this.syncMaxPages = syncMaxPages;
    }

    public List<ParkingLotResponseDto> findNearby(BigDecimal latitude, BigDecimal longitude, Integer radiusM) {
        int radius = radiusM == null ? DEFAULT_RADIUS_M : Math.min(radiusM, MAX_RADIUS_M);
        double degreeRange = (radius / METERS_PER_DEGREE) * 1.5;

        List<NearbyParkingLotProjection> nearby =
                parkingLotRepository.findNearbyIds(latitude, longitude, radius, degreeRange, RESULT_LIMIT);
        if (nearby.isEmpty()) {
            triggerBackgroundSyncIfIdle();
            return List.of();
        }

        Map<Long, Double> distanceByLotId = new LinkedHashMap<>();
        for (NearbyParkingLotProjection projection : nearby) {
            distanceByLotId.put(projection.getParkingLotId(), projection.getDistanceM());
        }

        Map<Long, ParkingLot> lotsById = parkingLotRepository.findAllById(distanceByLotId.keySet()).stream()
                .collect(java.util.stream.Collectors.toMap(ParkingLot::getParkingLotId, lot -> lot));

        return distanceByLotId.entrySet().stream()
                .map(entry -> toDto(lotsById.get(entry.getKey()), entry.getValue()))
                .filter(dto -> dto != null)
                .toList();
    }

    private ParkingLotResponseDto toDto(ParkingLot lot, double distanceM) {
        if (lot == null) {
            return null;
        }
        String feeType;
        String feeSummary;
        if (lot.getBaseFee() == null) {
            feeType = "정보없음";
            feeSummary = null;
        } else if (lot.getBaseFee() == 0) {
            feeType = "무료";
            feeSummary = null;
        } else {
            feeType = "유료";
            StringBuilder sb = new StringBuilder();
            sb.append("기본 ").append(lot.getBaseTimeMinutes()).append("분 ").append(lot.getBaseFee()).append("원");
            if (lot.getAdditionalUnitFee() != null && lot.getAdditionalUnitMinutes() != null) {
                sb.append(", 추가 ").append(lot.getAdditionalUnitMinutes()).append("분당 ")
                        .append(lot.getAdditionalUnitFee()).append("원");
            }
            feeSummary = sb.toString();
        }

        return new ParkingLotResponseDto(lot.getParkingLotId(), lot.getName(), lot.getAddress(), lot.getLatitude(),
                lot.getLongitude(), Math.round(distanceM), lot.getTotalSpaces(), feeType, feeSummary);
    }

    private void triggerBackgroundSyncIfIdle() {
        if (!parkingDataClient.isConfigured()) {
            return;
        }
        if (!backgroundSyncInProgress.compareAndSet(false, true)) {
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                var result = parkingSyncService.sync(syncMaxPages);
                log.info("[검색 유발] 주차장 정보 자동 동기화 완료: {}", result.getMessage());
            } catch (Exception e) {
                log.warn("[검색 유발] 주차장 정보 자동 동기화 실패: {}", e.getMessage());
            } finally {
                backgroundSyncInProgress.set(false);
            }
        }, "parking-search-triggered-sync");
        thread.setDaemon(true);
        thread.start();
    }
    */
}
