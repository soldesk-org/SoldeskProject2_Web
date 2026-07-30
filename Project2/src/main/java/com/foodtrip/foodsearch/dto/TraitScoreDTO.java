package com.foodtrip.foodsearch.dto;

/**
 * 한 성향 축의 비율을 화면에 전달합니다.
 * 예: 담백한 맛 33%, 강한 맛 67%, 우세 성향 S
 */
public class TraitScoreDTO {

    private String axisName;
    private String leftCode;
    private String leftName;
    private int leftPercent;
    private String rightCode;
    private String rightName;
    private int rightPercent;
    private String dominantCode;

    public TraitScoreDTO() {
    }

    public TraitScoreDTO(String axisName, String leftCode, String leftName, int leftPercent,
            String rightCode, String rightName, int rightPercent, String dominantCode) {
        this.axisName = axisName;
        this.leftCode = leftCode;
        this.leftName = leftName;
        this.leftPercent = leftPercent;
        this.rightCode = rightCode;
        this.rightName = rightName;
        this.rightPercent = rightPercent;
        this.dominantCode = dominantCode;
    }

    public String getAxisName() {
        return axisName;
    }

    public void setAxisName(String axisName) {
        this.axisName = axisName;
    }

    public String getLeftCode() {
        return leftCode;
    }

    public void setLeftCode(String leftCode) {
        this.leftCode = leftCode;
    }

    public String getLeftName() {
        return leftName;
    }

    public void setLeftName(String leftName) {
        this.leftName = leftName;
    }

    public int getLeftPercent() {
        return leftPercent;
    }

    public void setLeftPercent(int leftPercent) {
        this.leftPercent = leftPercent;
    }

    public String getRightCode() {
        return rightCode;
    }

    public void setRightCode(String rightCode) {
        this.rightCode = rightCode;
    }

    public String getRightName() {
        return rightName;
    }

    public void setRightName(String rightName) {
        this.rightName = rightName;
    }

    public int getRightPercent() {
        return rightPercent;
    }

    public void setRightPercent(int rightPercent) {
        this.rightPercent = rightPercent;
    }

    public String getDominantCode() {
        return dominantCode;
    }

    public void setDominantCode(String dominantCode) {
        this.dominantCode = dominantCode;
    }
}
