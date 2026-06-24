package com.zetflix.contentservice.model;

/*
Tracks the video processing lifecycle
FLOW: PENDING -> UPLOADED -> ENCODING -> READY -> FAILED
*/
public enum VideoStatus {
    PENDING, // movie added but not yet uploaded
    UPLOADED, // raw video uploaded for encoding
    ENCODING, // FFmpeg encoding the video 
    ENCODED, // Encoding Completed
    READY, // HLS playlist ready
    FAILED // Encoding Failed
}

