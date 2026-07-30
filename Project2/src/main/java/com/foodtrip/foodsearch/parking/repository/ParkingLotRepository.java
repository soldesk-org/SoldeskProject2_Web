package com.foodtrip.foodsearch.parking.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.parking.entity.ParkingLot;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, Long> {

    Optional<ParkingLot> findBySourceAndExternalId(String source, String externalId);

    // Haversine 공식으로 직선거리(m)를 계산해 반경 내 주차장 id와 거리만 가까운 순으로 뽑는다(001-02 2-2장).
    // 엔티티 전체를 native query의 Object[]로 매핑하면 컬럼 순서에 의존하게 되어 스키마가 조금만 바뀌어도
    // 깨지기 쉬우므로, id+거리만 이 쿼리로 얻고 실제 엔티티는 findAllById()로 다시 조회하는 2단계 방식을
    // 쓴다(ParkingLotServiceImpl 참고). WHERE 절의 bounding box는 MariaDB가 매번 전체 행에 삼각함수를
    // 계산하지 않도록 걸러주는 성능용 사전 필터(정확한 거리는 HAVING에서 다시 계산).
    @Query(value = """
            SELECT parking_lot_id AS parkingLotId, (
                6371000 * ACOS(
                    COS(RADIANS(:latitude)) * COS(RADIANS(latitude)) *
                    COS(RADIANS(longitude) - RADIANS(:longitude)) +
                    SIN(RADIANS(:latitude)) * SIN(RADIANS(latitude))
                )
            ) AS distanceM
            FROM parking_lots
            WHERE latitude BETWEEN :latitude - :degreeRange AND :latitude + :degreeRange
              AND longitude BETWEEN :longitude - :degreeRange AND :longitude + :degreeRange
            HAVING distanceM <= :radiusM
            ORDER BY distanceM ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<NearbyParkingLotProjection> findNearbyIds(@Param("latitude") BigDecimal latitude,
                                                     @Param("longitude") BigDecimal longitude,
                                                     @Param("radiusM") double radiusM,
                                                     @Param("degreeRange") double degreeRange,
                                                     @Param("limit") int limit);

    interface NearbyParkingLotProjection {
        Long getParkingLotId();

        Double getDistanceM();
    }
}
