const RASTER_INPUT_SHAPES = new Set(['image', 'video']);
const RASTER_MEDIA_TIME_EPSILON = 1e-4;



function isRasterInputShape(shape = state.currentInputShape) {
    return RASTER_INPUT_SHAPES.has(shape);
}

function getRasterSourceForShape(shape = state.currentInputShape) {
    return shape === 'video' ? state.uploadedVideo : state.uploadedImage;
}



function getRasterResolutionForShape(shape = state.currentInputShape) {
    return shape === 'video' ? state.videoResolution : state.imageResolution;
}

function getRasterSizeForShape(shape = state.currentInputShape) {
    return shape === 'video' ? state.videoSize : state.imageSize;
}

function getRasterOpacityForShape(shape = state.currentInputShape) {
    return shape === 'video' ? state.videoOpacity : state.imageOpacity;
}

function getRasterAspectRatioForShape(shape = state.currentInputShape) {
    const aspectRatio = shape === 'video' ? state.videoAspectRatio : state.imageAspectRatio;
    return Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
}

function getRasterVersionTokenForShape(shape = state.currentInputShape) {
    return shape === 'video' ? state.videoFrameVersion : state.imageContentVersion;
}

function getRasterSourceDimensions(source) {
    if (!source) {
        return { width: 0, height: 0, aspectRatio: 1 };
    }

    const width = Math.max(
        0,
        source.videoWidth || source.naturalWidth || source.width || 0
    );
    const height = Math.max(
        0,
        source.videoHeight || source.naturalHeight || source.height || 0
    );

    if (!width || !height) {
        return { width: 0, height: 0, aspectRatio: 1 };
    }

    return {
        width,
        height,
        aspectRatio: width / height
    };
}

function getRasterDisplayDimensions(shape = state.currentInputShape) {
    const size = Math.max(0.1, getRasterSizeForShape(shape) || 2.0);
    const aspectRatio = getRasterAspectRatioForShape(shape);

    if (aspectRatio >= 1) {
        return {
            width: size,
            height: size / aspectRatio
        };
    }

    return {
        width: size * aspectRatio,
        height: size
    };
}





function processUploadedImageSource(img) {
    if (!img) {
        return false;
    }

    state.uploadedImage = img;
    const { aspectRatio } = getRasterSourceDimensions(img);
    state.imageAspectRatio = aspectRatio;
    state.imageContentVersion += 1;
    return true;
}

function processUploadedVideoFrame(force = false) {
    const video = state.uploadedVideo;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return false;
    }

    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    if (!force && Math.abs(currentTime - state.videoLastProcessedMediaTime) < RASTER_MEDIA_TIME_EPSILON) {
        return false;
    }

    const { aspectRatio } = getRasterSourceDimensions(video);
    state.videoAspectRatio = aspectRatio;



    state.videoFrameVersion += 1;
    state.videoLastProcessedMediaTime = currentTime;
    syncVideoPlaybackUI();
    return true;
}

function formatMediaClockTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
        return '--:--';
    }

    const wholeSeconds = Math.floor(totalSeconds);
    const hours = Math.floor(wholeSeconds / 3600);
    const minutes = Math.floor((wholeSeconds % 3600) / 60);
    const seconds = wholeSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildVideoStatusText() {
    if (!state.uploadedVideo) {
        return state.videoStatusMessage || 'No video loaded.';
    }

    const video = state.uploadedVideo;
    const statusLabel = state.videoStatusMessage || (state.videoIsPlaying ? 'Playing' : 'Paused');
    const currentTime = formatMediaClockTime(video.currentTime);
    const duration = formatMediaClockTime(video.duration);
    const { width, height } = getRasterSourceDimensions(video);
    const dims = width && height ? ` · ${width}x${height}` : '';
    const fps = Math.max(1, Math.round(state.videoProcessingFps || 24));

    return `${statusLabel} · ${currentTime} / ${duration}${dims} · ${fps} FPS`;
}

function syncVideoPlaybackUI() {
    if (controls.videoPlayPauseBtn) {
        controls.videoPlayPauseBtn.disabled = !state.uploadedVideo;
        controls.videoPlayPauseBtn.textContent = state.videoIsPlaying ? '⏸ Pause' : '▶ Play';
    }

    if (controls.videoStatusDisplay) {
        controls.videoStatusDisplay.textContent = buildVideoStatusText();
    }
}

function stopVideoProcessingLoop() {
    if (state.videoProcessingLoopHandle) {
        cancelAnimationFrame(state.videoProcessingLoopHandle);
        state.videoProcessingLoopHandle = null;
    }
}

function runVideoProcessingLoop(now) {
    state.videoProcessingLoopHandle = null;

    if (!state.uploadedVideo || !state.videoIsPlaying || state.currentInputShape !== 'video') {
        syncVideoPlaybackUI();
        return;
    }

    const targetFps = Math.max(1, state.videoProcessingFps || 24);
    const targetInterval = 1000 / targetFps;
    const elapsed = now - state.videoLastProcessedWallTime;

    if (elapsed >= targetInterval) {
        if (processUploadedVideoFrame()) {
            state.videoLastProcessedWallTime = now;
            if (typeof requestDomainRedraw === 'function') {
                requestDomainRedraw(false);
            } else if (typeof requestRedrawAll === 'function') {
                requestRedrawAll();
            }
        } else {
            syncVideoPlaybackUI();
        }
    }

    state.videoProcessingLoopHandle = requestAnimationFrame(runVideoProcessingLoop);
}

function startVideoProcessingLoop() {
    stopVideoProcessingLoop();

    if (!state.uploadedVideo || !state.videoIsPlaying || state.currentInputShape !== 'video') {
        syncVideoPlaybackUI();
        return;
    }

    state.videoLastProcessedWallTime = performance.now() - (1000 / Math.max(1, state.videoProcessingFps || 24));
    state.videoProcessingLoopHandle = requestAnimationFrame(runVideoProcessingLoop);
    syncVideoPlaybackUI();
}

function pauseUploadedVideoPlayback() {
    const video = state.uploadedVideo;
    if (video) {
        video.pause();
    }

    state.videoIsPlaying = false;
    if (state.uploadedVideo) {
        state.videoStatusMessage = 'Paused';
    }
    stopVideoProcessingLoop();
    syncVideoPlaybackUI();

    if (typeof requestRedrawAll === 'function') {
        requestRedrawAll();
    }
}

function startUploadedVideoPlayback() {
    const video = state.uploadedVideo;
    if (!video) {
        syncVideoPlaybackUI();
        return Promise.resolve(false);
    }

    state.videoStatusMessage = 'Starting playback';
    syncVideoPlaybackUI();

    return video.play().then(() => {
        state.videoIsPlaying = true;
        state.videoStatusMessage = 'Playing';
        if (state.currentInputShape === 'video') {
            startVideoProcessingLoop();
        } else {
            stopVideoProcessingLoop();
        }

        syncVideoPlaybackUI();
        if (typeof requestRedrawAll === 'function') {
            requestRedrawAll();
        }
        return true;
    }).catch(error => {
        state.videoIsPlaying = false;
        state.videoStatusMessage = 'Ready to play';
        stopVideoProcessingLoop();
        syncVideoPlaybackUI();
        console.warn('Video playback could not start automatically:', error);
        return false;
    });
}

function toggleUploadedVideoPlayback() {
    if (state.videoIsPlaying) {
        pauseUploadedVideoPlayback();
        return;
    }

    startUploadedVideoPlayback();
}

function cleanupUploadedVideo() {
    const previousVideo = state.uploadedVideo;
    const previousUrl = state.uploadedVideoUrl;

    state.uploadedVideo = null;
    state.uploadedVideoUrl = '';
    state.videoIsPlaying = false;
    state.videoAspectRatio = 1.0;
    state.videoFrameVersion += 1;
    state.videoLastProcessedWallTime = 0;
    state.videoLastProcessedMediaTime = -1;
    state.videoStatusMessage = 'No video loaded.';

    stopVideoProcessingLoop();

    if (previousVideo) {
        previousVideo.pause();
        previousVideo.removeAttribute('src');
        try {
            previousVideo.load();
        } catch (error) {
            console.warn('Unable to fully reset previous video element:', error);
        }
    }

    if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
    }

    syncVideoPlaybackUI();
}

function loadUploadedVideoFile(file) {
    cleanupUploadedVideo();

    if (!file) {
        return;
    }

    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'auto';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    state.uploadedVideo = video;
    state.uploadedVideoUrl = objectUrl;
    state.videoStatusMessage = 'Loading video';
    syncVideoPlaybackUI();

    const handleReady = () => {
        if (state.uploadedVideo !== video) {
            return;
        }

        processUploadedVideoFrame(true);
        state.videoStatusMessage = 'Ready to play';
        syncVideoPlaybackUI();

        if (typeof requestRedrawAll === 'function') {
            requestRedrawAll();
        }

        if (state.currentInputShape === 'video') {
            startUploadedVideoPlayback();
        }
    };

    video.addEventListener('loadeddata', handleReady, { once: true });
    video.addEventListener('play', () => {
        if (state.uploadedVideo !== video) {
            return;
        }
        state.videoIsPlaying = true;
        state.videoStatusMessage = 'Playing';
        if (state.currentInputShape === 'video') {
            startVideoProcessingLoop();
        }
        syncVideoPlaybackUI();
    });
    video.addEventListener('pause', () => {
        if (state.uploadedVideo !== video) {
            return;
        }
        state.videoIsPlaying = false;
        state.videoStatusMessage = 'Paused';
        stopVideoProcessingLoop();
        processUploadedVideoFrame(true);
        syncVideoPlaybackUI();
        if (typeof requestRedrawAll === 'function') {
            requestRedrawAll();
        }
    });
    video.addEventListener('error', () => {
        if (state.uploadedVideo !== video) {
            return;
        }
        state.videoIsPlaying = false;
        state.videoStatusMessage = 'Could not load video.';
        stopVideoProcessingLoop();
        syncVideoPlaybackUI();
    });

    video.src = objectUrl;
    video.load();
}
