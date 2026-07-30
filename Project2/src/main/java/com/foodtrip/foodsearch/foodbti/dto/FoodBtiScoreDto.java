package com.foodtrip.foodsearch.foodbti.dto;

public class FoodBtiScoreDto {

    private final int l;
    private final int s;
    private final int f;
    private final int n;
    private final int a;
    private final int t;
    private final int p;
    private final int i;

    public FoodBtiScoreDto(int l, int s, int f, int n, int a, int t, int p, int i) {
        this.l = l;
        this.s = s;
        this.f = f;
        this.n = n;
        this.a = a;
        this.t = t;
        this.p = p;
        this.i = i;
    }

    public int getL() {
        return l;
    }

    public int getS() {
        return s;
    }

    public int getF() {
        return f;
    }

    public int getN() {
        return n;
    }

    public int getA() {
        return a;
    }

    public int getT() {
        return t;
    }

    public int getP() {
        return p;
    }

    public int getI() {
        return i;
    }
}
