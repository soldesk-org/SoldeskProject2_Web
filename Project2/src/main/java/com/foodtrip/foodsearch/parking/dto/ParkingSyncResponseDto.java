package com.foodtrip.foodsearch.parking.dto;

public class ParkingSyncResponseDto {

    private final boolean success;
    private final String message;
    private final int facilitySynced;
    private final int feeInfoSynced;

    public ParkingSyncResponseDto(boolean success, String message, int facilitySynced, int feeInfoSynced) {
        this.success = success;
        this.message = message;
        this.facilitySynced = facilitySynced;
        this.feeInfoSynced = feeInfoSynced;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public int getFacilitySynced() {
        return facilitySynced;
    }

    public int getFeeInfoSynced() {
        return feeInfoSynced;
    }
}
