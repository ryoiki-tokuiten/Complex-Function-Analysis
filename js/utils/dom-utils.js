const DOM_BINDINGS = [
    { key: 'controlsOptionsSection', id: 'controls_options_section' },
    { key: 'controlsPanelsRow', id: 'controls_panels_row' },
    { key: 'topControlsCollapsedBar', id: 'top_controls_collapsed_bar' },
    { key: 'toggleTopControlsBtn', id: 'toggle_top_controls_btn' },
    { key: 'toggleTopControlsCollapsedBtn', id: 'toggle_top_controls_collapsed_btn' },
    { key: 'zPlaneCanvas', id: 'z_plane_canvas' },
    { key: 'wPlaneCanvas', id: 'w_plane_canvas' },
    { key: 'zCanvasCard', id: 'z_plane_column' },
    { key: 'wCanvasCard', id: 'w_plane_column' },
    { key: 'toggleFullscreenZBtn', id: 'toggle_fullscreen_z_btn' },
    { key: 'toggleFullscreenWBtn', id: 'toggle_fullscreen_w_btn' },
    { key: 'fullscreenContainer', id: 'fullscreen_container' },
    { key: 'closeFullscreenBtn', id: 'close_fullscreen_btn' },
    { key: 'commonParamsSliders', id: 'common_params_sliders' },
    { key: 'shapeParamsSliders', id: 'shape_params_sliders' },
    { key: 'mobiusParamsSliders', id: 'mobius_params_sliders' },
    { key: 'polynomialParamsSliders', id: 'polynomial_params_sliders' },
    { key: 'polynomialNSlider', id: 'polynomialN_slider' },
    { key: 'polynomialNValueDisplay', id: 'polynomialN_value_display' },
    { key: 'polynomialCoeffsContainer', id: 'polynomial_coeffs_container' },
    { key: 'circleRSliderGroup', id: 'circleR_slider_group' },
    { key: 'ellipseParamsSliderGroup', id: 'ellipse_params_slider_group' },
    { key: 'hyperbolaParamsSliderGroup', id: 'hyperbola_params_slider_group' },
    { key: 'stripHorizontalParamsSliders', id: 'strip_horizontal_params_sliders' },
    { key: 'stripY1Slider', id: 'stripY1_slider' },
    { key: 'stripY1ValueDisplay', id: 'stripY1_value_display' },
    { key: 'stripY2Slider', id: 'stripY2_slider' },
    { key: 'stripY2ValueDisplay', id: 'stripY2_value_display' },
    { key: 'sectorAngularParamsSliders', id: 'sector_angular_params_sliders' },
    { key: 'sectorAngle1Slider', id: 'sectorAngle1_slider' },
    { key: 'sectorAngle1ValueDisplay', id: 'sectorAngle1_value_display' },
    { key: 'sectorAngle2Slider', id: 'sectorAngle2_slider' },
    { key: 'sectorAngle2ValueDisplay', id: 'sectorAngle2_value_display' },
    { key: 'sectorRMinSlider', id: 'sectorRMin_slider' },
    { key: 'sectorRMinValueDisplay', id: 'sectorRMin_value_display' },
    { key: 'sectorRMaxSlider', id: 'sectorRMax_slider' },
    { key: 'sectorRMaxValueDisplay', id: 'sectorRMax_value_display' },
    { key: 'inputShapeSelector', id: 'input_shape_selector' },
    { key: 'fourierSpecificControlsDiv', id: 'fourier_specific_controls' },
    { key: 'fourierFunctionSelector', id: 'fourier_function_selector' },
    { key: 'fourierFrequencySlider', id: 'fourier_frequency_slider' },
    { key: 'fourierFrequencyValueDisplay', id: 'fourier_frequency_value_display' },
    { key: 'fourierAmplitudeSlider', id: 'fourier_amplitude_slider' },
    { key: 'fourierAmplitudeValueDisplay', id: 'fourier_amplitude_value_display' },
    { key: 'fourierTimeWindowSlider', id: 'fourier_time_window_slider' },
    { key: 'fourierTimeWindowValueDisplay', id: 'fourier_time_window_value_display' },
    { key: 'fourierSamplesSlider', id: 'fourier_samples_slider' },
    { key: 'fourierSamplesValueDisplay', id: 'fourier_samples_value_display' },
    { key: 'fourierWindingFrequencySlider', id: 'fourier_winding_frequency_slider' },
    { key: 'fourierWindingFrequencyValueDisplay', id: 'fourier_winding_frequency_value_display' },
    { key: 'fourierWindingTimeSlider', id: 'fourier_winding_time_slider' },
    { key: 'fourierWindingTimeValueDisplay', id: 'fourier_winding_time_value_display' },
    { key: 'laplaceSpecificControlsDiv', id: 'laplace_specific_controls' },
    { key: 'laplaceFunctionSelector', id: 'laplace_function_selector' },
    { key: 'laplaceFrequencySlider', id: 'laplace_frequency_slider' },
    { key: 'laplaceFrequencyValueDisplay', id: 'laplace_frequency_value_display' },
    { key: 'laplaceDampingSlider', id: 'laplace_damping_slider' },
    { key: 'laplaceDampingValueDisplay', id: 'laplace_damping_value_display' },
    { key: 'laplaceSigmaSlider', id: 'laplace_sigma_slider' },
    { key: 'laplaceSigmaValueDisplay', id: 'laplace_sigma_value_display' },
    { key: 'laplaceOmegaSlider', id: 'laplace_omega_slider' },
    { key: 'laplaceOmegaValueDisplay', id: 'laplace_omega_value_display' },
    { key: 'laplaceShowROCCb', id: 'laplace_show_roc_cb' },
    { key: 'laplaceVizModeSelector', id: 'laplace_viz_mode_selector' },
    { key: 'laplaceClipHeightSlider', id: 'laplace_clip_height_slider' },
    { key: 'laplaceClipHeightValueDisplay', id: 'laplace_clip_height_value_display' },
    { key: 'laplaceShowPolesZerosCb', id: 'laplace_show_poles_zeros_cb' },
    { key: 'laplaceFindPolesZerosBtn', id: 'laplace_find_poles_zeros_btn' },
    { key: 'laplaceStabilityAnalysisBtn', id: 'laplace_stability_analysis_btn' },
    { key: 'laplaceStabilityDisplay', id: 'laplace_stability_display' },
    { key: 'laplaceShowFourierLineCb', id: 'laplace_show_fourier_line_cb' },
    { key: 'wPlaneTitleFunc', id: 'w-plane-title-func' },
    { key: 'zPlaneTitle', id: 'z-plane-title' },
    { key: 'wPlaneTitle', id: 'w-plane-title' },
    { key: 'enableDomainColoringCb', id: 'enable_domain_coloring_cb' },
    { key: 'domainColoringOptionsDiv', id: 'domain_coloring_options_div' },
    { key: 'domainBrightnessSlider', id: 'domain_brightness_slider' },
    { key: 'domainBrightnessValueDisplay', id: 'domain_brightness_value_display' },
    { key: 'domainContrastSlider', id: 'domain_contrast_slider' },
    { key: 'domainContrastValueDisplay', id: 'domain_contrast_value_display' },
    { key: 'domainSaturationSlider', id: 'domain_saturation_slider' },
    { key: 'domainSaturationValueDisplay', id: 'domain_saturation_value_display' },
    { key: 'domainLightnessCyclesSlider', id: 'domain_lightness_cycles_slider' },
    { key: 'domainLightnessCyclesValueDisplay', id: 'domain_lightness_cycles_value_display' },
    { key: 'domainColoringKeyDiv', id: 'domain_coloring_key' },
    { key: 'gridDensitySlider', id: 'grid_density_slider' },
    { key: 'gridDensityValueDisplay', id: 'grid_density_value_display' },
    { key: 'showZerosPolesCb', id: 'show_zeros_poles_cb' },
    { key: 'showCriticalPointsCb', id: 'show_critical_points_cb' },
    { key: 'neighborhoodSizeSlider', id: 'neighborhood_size_slider' },
    { key: 'neighborhoodSizeValueDisplay', id: 'neighborhood_size_value_display' },
    { key: 'enableRiemannSphereCb', id: 'enable_riemann_sphere_cb' },
    { key: 'enableTaylorSeriesCb', id: 'enable_taylor_series_cb' },
    { key: 'taylorSeriesOptionsDetailDiv', id: 'taylor_series_options_detail_div' },
    { key: 'taylorSeriesCenterStatus', id: 'taylor_series_center_status' },
    { key: 'taylorSeriesOrderSlider', id: 'taylor_series_order_slider' },
    { key: 'taylorSeriesOrderValueDisplay', id: 'taylor_series_order_value_display' },
    { key: 'enableTaylorSeriesCustomCenterCb', id: 'enable_taylor_series_custom_center_cb' },
    { key: 'taylorSeriesCustomCenterInputsDiv', id: 'taylor_series_custom_center_inputs_div' },
    { key: 'taylorSeriesPresetGroups', id: 'taylor_series_preset_groups' },
    { key: 'taylorSeriesCustomCenterReInput', id: 'taylor_series_custom_center_re_input' },
    { key: 'taylorSeriesCustomCenterImInput', id: 'taylor_series_custom_center_im_input' },
    { key: 'zPlaneProbeInfo', id: 'z_plane_probe_info' },
    { key: 'wPlaneProbeInfo', id: 'w_plane_probe_info' },
    { key: 'wPlaneAnalysisInfo', id: 'w_plane_analysis_info' },
    { key: 'zPlaneZoomSlider', id: 'z_plane_zoom_slider' },
    { key: 'zPlaneZoomValueDisplay', id: 'z_plane_zoom_value_display' },
    { key: 'wPlaneZoomSlider', id: 'w_plane_zoom_slider' },
    { key: 'wPlaneZoomValueDisplay', id: 'w_plane_zoom_value_display' },
    { key: 'toggleZetaContinuationBtn', id: 'toggle_zeta_continuation_btn' },
    { key: 'zetaSpecificControlsDiv', id: 'zeta_specific_controls' },
    { key: 'enableVectorFieldCb', id: 'enable_vector_field_cb' },
    { key: 'vectorFieldOptionsDiv', id: 'vector_field_options_div' },
    { key: 'vectorFieldFunctionSelector', id: 'vector_field_function_selector' },
    { key: 'vectorFieldScaleSlider', id: 'vector_field_scale_slider' },
    { key: 'vectorFieldScaleValueDisplay', id: 'vector_field_scale_value_display' },
    { key: 'enableCauchyIntegralModeCb', id: 'enable_cauchy_integral_mode_cb' },
    { key: 'cauchyIntegralResultsInfo', id: 'cauchy_integral_results_info' },
    { key: 'imageUploadControls', id: 'image_upload_controls' },
    { key: 'imageUploadInput', id: 'image_upload_input' },
    { key: 'imageResolutionSlider', id: 'image_resolution_slider' },
    { key: 'imageResolutionValueDisplay', id: 'image_resolution_value_display' },
    { key: 'imageSizeSlider', id: 'image_size_slider' },
    { key: 'imageSizeValueDisplay', id: 'image_size_value_display' },
    { key: 'imageOpacitySlider', id: 'image_opacity_slider' },
    { key: 'imageOpacityValueDisplay', id: 'image_opacity_value_display' },
    { key: 'videoUploadControls', id: 'video_upload_controls' },
    { key: 'videoUploadInput', id: 'video_upload_input' },
    { key: 'videoPlayPauseBtn', id: 'video_play_pause_btn' },
    { key: 'videoStatusDisplay', id: 'video_status_display' },
    { key: 'videoResolutionSlider', id: 'video_resolution_slider' },
    { key: 'videoResolutionValueDisplay', id: 'video_resolution_value_display' },
    { key: 'videoFpsSlider', id: 'video_fps_slider' },
    { key: 'videoFpsValueDisplay', id: 'video_fps_value_display' },
    { key: 'videoSizeSlider', id: 'video_size_slider' },
    { key: 'videoSizeValueDisplay', id: 'video_size_value_display' },
    { key: 'videoOpacitySlider', id: 'video_opacity_slider' },
    { key: 'videoOpacityValueDisplay', id: 'video_opacity_value_display' },
    { key: 'enableRadialDiscreteStepsCb', id: 'enable_radial_discrete_steps_cb' },
    { key: 'radialDiscreteStepsOptionsDiv', id: 'radial_discrete_steps_options_div' },
    { key: 'radialDiscreteStepsCountSlider', id: 'radial_discrete_steps_count_slider' },
    { key: 'radialDiscreteStepsCountValueDisplay', id: 'radial_discrete_steps_count_value_display' },
    { key: 'enableSplitViewCb', id: 'enable_split_view_cb' },
    { key: 'enablePlotly3DCb', id: 'enable_plotly_3d_cb' },
    { key: 'wPlanePlotlyContainer', id: 'w_plane_plotly_container' },
    { key: 'plotly3DOptionsDiv', id: 'plotly_3d_options_div' },
    { key: 'riemannSphereOptionsDiv', id: 'riemann_sphere_options_div' },
    { key: 'toggleSphereAxesGridCb', id: 'toggle_sphere_axes_grid_cb' },
    { key: 'plotlySphereOpacitySlider', id: 'plotly_sphere_opacity_slider' },
    { key: 'plotlySphereOpacityValueDisplay', id: 'plotly_sphere_opacity_value_display' },
    { key: 'plotlyGridDensitySlider', id: 'plotly_grid_density_slider' },
    { key: 'plotlyGridDensityValueDisplay', id: 'plotly_grid_density_value_display' },
    { key: 'togglePlotlySphereGridCb', id: 'toggle_plotly_sphere_grid_cb' },
    { key: 'sphereViewControlsDiv', id: 'sphere_view_controls_div' },
    { key: 'sphereViewNorthBtn', id: 'sphere_view_north_btn' },
    { key: 'sphereViewSouthBtn', id: 'sphere_view_south_btn' },
    { key: 'sphereViewEastBtn', id: 'sphere_view_east_btn' },
    { key: 'sphereViewWestBtn', id: 'sphere_view_west_btn' },
    { key: 'sphereViewFrontBtn', id: 'sphere_view_front_btn' },
    { key: 'sphereViewResetBtn', id: 'sphere_view_reset_btn' },
    { key: 'showVectorFieldPanelCb', id: 'show_vector_field_panel_cb' },
    { key: 'vectorFlowOptionsContent', id: 'vector_flow_options_content' },
    { key: 'vectorArrowThicknessSlider', id: 'vector_arrow_thickness_slider' },
    { key: 'vectorArrowThicknessValueDisplay', id: 'vector_arrow_thickness_value_display' },
    { key: 'vectorArrowHeadSizeSlider', id: 'vector_arrow_head_size_slider' },
    { key: 'vectorArrowHeadSizeValueDisplay', id: 'vector_arrow_head_size_value_display' },
    { key: 'enableStreamlineFlowCb', id: 'enable_streamline_flow_cb' },
    { key: 'streamlineOptionsDetailsDiv', id: 'streamline_options_details_div' },
    { key: 'clearManualSeedsBtn', id: 'clear_manual_seeds_btn' },
    { key: 'streamlineStepSizeSlider', id: 'streamline_step_size_slider' },
    { key: 'streamlineStepSizeValueDisplay', id: 'streamline_step_size_value_display' },
    { key: 'streamlineMaxLengthSlider', id: 'streamline_max_length_slider' },
    { key: 'streamlineMaxLengthValueDisplay', id: 'streamline_max_length_value_display' },
    { key: 'streamlineThicknessSlider', id: 'streamline_thickness_slider' },
    { key: 'streamlineThicknessValueDisplay', id: 'streamline_thickness_value_display' },
    { key: 'streamlineSeedDensityFactorSlider', id: 'streamline_seed_density_factor_slider' },
    { key: 'streamlineSeedDensityFactorValueDisplay', id: 'streamline_seed_density_factor_value_display' },
    { key: 'enableParticleAnimationCb', id: 'enable_particle_animation_cb' },
    { key: 'particleAnimationDetailsDiv', id: 'particle_animation_details_div' },
    { key: 'particleDensitySlider', id: 'particle_density_slider' },
    { key: 'particleDensityValueDisplay', id: 'particle_density_value_display' },
    { key: 'particleSpeedSlider', id: 'particle_speed_slider' },
    { key: 'particleSpeedValueDisplay', id: 'particle_speed_value_display' },
    { key: 'particleMaxLifetimeSlider', id: 'particle_max_lifetime_slider' },
    { key: 'particleMaxLifetimeValueDisplay', id: 'particle_max_lifetime_value_display' },
    { key: 'laplaceAnimationSpeedSlider', id: 'laplace_animation_speed_slider' },
    { key: 'laplaceAnimationSpeedDisplay', id: 'laplace_animation_speed_display' },
    { key: 'laplaceAnimationLoopCb', id: 'laplace_animation_loop_cb' },
    { key: 'laplacePlayPauseBtn', id: 'laplace_play_pause_btn' },
    { key: 'laplaceShowFullBtn', id: 'laplace_show_full_btn' },
    { key: 'laplaceWindingSyncBtn', id: 'laplace_winding_sync_btn' },
    { key: 'toggleFullscreenLaplace3DBtn', id: 'toggle_fullscreen_laplace_3d_btn' },
    { key: 'laplaceResetBtn', id: 'laplace_reset_btn' },
    { key: 'laplace3DColumn', id: 'laplace_3d_column' },
    { key: 'laplace3DTitleLabel', id: 'laplace_3d_title_label' },
    { key: 'laplace3DContainer', id: 'laplace_3d_container' },
    { key: 'preloader', id: 'preloader' },
    { key: 'functionControlsPanel', id: 'function-controls-panel' },
    { key: 'parameterControlsPanel', id: 'parameter-controls-panel' },
    { key: 'visualizationOptionsPanel', id: 'visualization-options-panel' }
];

function formatTaylorNumericValue(value) {
    if (!Number.isFinite(value)) {
        return '0';
    }

    const normalizedValue = Math.abs(value) < 1e-10 ? 0 : value;
    return Number(normalizedValue.toFixed(6)).toString();
}

function findTaylorCenterPreset(re, im) {
    return TAYLOR_CENTER_PRESETS.find(preset =>
        Math.abs(preset.re - re) < 1e-9 &&
        Math.abs(preset.im - im) < 1e-9
    ) || null;
}

function renderTaylorPresetGroups() {
    if (!controls.taylorSeriesPresetGroups) {
        return;
    }

    const fragment = document.createDocumentFragment();

    TAYLOR_CENTER_PRESET_GROUPS.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'taylor-series-preset-group';

        const headingElement = document.createElement('div');
        headingElement.className = 'taylor-series-preset-group-title';
        headingElement.textContent = group.label;
        groupElement.appendChild(headingElement);

        const buttonRow = document.createElement('div');
        buttonRow.className = 'taylor-series-preset-buttons';

        group.presets.forEach(preset => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'taylor-series-preset-btn';
            button.textContent = preset.label;
            button.dataset.taylorPresetRe = String(preset.re);
            button.dataset.taylorPresetIm = String(preset.im);
            buttonRow.appendChild(button);
        });

        groupElement.appendChild(buttonRow);
        fragment.appendChild(groupElement);
    });

    controls.taylorSeriesPresetGroups.replaceChildren(fragment);
}

function setupDOMReferences() {
    zCanvas = document.getElementById('z_plane_canvas'); wCanvas = document.getElementById('w_plane_canvas');
    zCtx = zCanvas.getContext('2d');
    zCtx.imageSmoothingEnabled = true;
    zCtx.imageSmoothingQuality = 'high';
    wCtx = wCanvas.getContext('2d');
    wCtx.imageSmoothingEnabled = true;
    wCtx.imageSmoothingQuality = 'high';

    if (typeof initializeWebGLLineSupport === 'function') {
        initializeWebGLLineSupport();
    }
    if (typeof initializeWebGLDomainColoringSupport === 'function') {
        initializeWebGLDomainColoringSupport();
    }

    DOM_BINDINGS.forEach(binding => {
        controls[binding.key] = document.getElementById(binding.id);
    });
    renderTaylorPresetGroups();
    controls.cauchy_integral_results_info = controls.cauchyIntegralResultsInfo;
    controls.zPlaneCanvas = zCanvas;
    controls.wPlaneCanvas = wCanvas;

    zDomainColorCanvas = document.createElement('canvas'); wDomainColorCanvas = document.createElement('canvas');
    zDomainColorCtx = zDomainColorCanvas.getContext('2d', { willReadFrequently: true });
    zDomainColorCtx.imageSmoothingEnabled = true;
    zDomainColorCtx.imageSmoothingQuality = 'high';
    wDomainColorCtx = wDomainColorCanvas.getContext('2d', { willReadFrequently: true });
    wDomainColorCtx.imageSmoothingEnabled = true;
    wDomainColorCtx.imageSmoothingQuality = 'high';

    sliderParamKeys.forEach(key => {
        controls[`${key}Slider`] = document.getElementById(`${key}_slider`);
        controls[`${key}ValueDisplay`] = document.getElementById(`${key}_value_display`);
        controls[`${key}LabelDesc`] = document.getElementById(`${key}_label_desc`); 
        const playBtn = document.getElementById(`play_${key}_btn`); if (playBtn) controls[`play_${key}Btn`] = playBtn;
        const speedSel = document.getElementById(`speed_${key}_selector`); if (speedSel) controls[`speed_${key}Selector`] = speedSel;
    });

    ['A', 'B', 'C', 'D'].forEach(param => {
        ['re', 'im'].forEach(part => {
            controls[`mobius${param}_${part}_slider`] = document.getElementById(`mobius${param}_${part}_slider`);
            controls[`mobius${param}_${part}_value_display`] = document.getElementById(`mobius${param}_${part}_value_display`);
            controls[`play_mobius${param}_${part}_btn`] = document.getElementById(`play_mobius${param}_${part}_btn`);
            controls[`speed_mobius${param}_${part}_selector`] = document.getElementById(`speed_mobius${param}_${part}_selector`);
        });
    });

    controls.funcButtons = {};
    ['fourier', 'laplace', 'cos', 'sin', 'tan', 'sec', 'exp', 'ln', 'reciprocal', 'mobius', 'zeta', 'polynomial', 'poincare'].forEach(f => { 
        controls.funcButtons[f] = document.getElementById(`select_${f}_btn`);
    });
    
    const essentialControlIds = [
        'z_plane_canvas', 'w_plane_canvas', // These are global vars, special check
        'inputShapeSelector', 'gridDensitySlider',
        'functionControlsPanel', 'visualizationOptionsPanel',
        'commonParamsSliders',
        'shapeParamsSliders', 'mobiusParamsSliders', 'polynomialParamsSliders',
        'enableDomainColoringCb', 'showZerosPolesCb', 'showCriticalPointsCb',
        'enableRiemannSphereCb', 'enableSplitViewCb', 'enableVectorFieldCb',
        'zPlaneZoomSlider', 'wPlaneZoomSlider'
    ];

    essentialControlIds.forEach(id => {
        if (id === 'z_plane_canvas') {
            if (typeof zCanvas === 'undefined' || !zCanvas) console.error("Essential control not found: zCanvas (from id: z_plane_canvas)");
        } else if (id === 'w_plane_canvas') {
            if (typeof wCanvas === 'undefined' || !wCanvas) console.error("Essential control not found: wCanvas (from id: w_plane_canvas)");
        } else if (!controls[id]) {
            // Attempt to find by original kebab-case if the id in essentialControlIds is camelCase from a kebab-case id
            const originalKebabID = id.replace(/([A-Z])/g, "-$1").toLowerCase();
            if (document.getElementById(originalKebabID)) {
                 console.warn(`Essential control ID '${id}' in essentialControlIds might need to match the exact property in 'controls' object. Element with ID '${originalKebabID}' exists but 'controls.${id}' is missing.`);
            } else {
                 console.error(`Essential control not found: controls.${id} (and no corresponding element by likely original ID)`);
            }
        }
    });
}

function setupCanvasBaseParams(planeParams, canvasElement, sphereViewObj, isFullscreen = false) {
    let newWidth, newHeight;
    if (isFullscreen) {
        const container = canvasElement.parentElement; 
        newWidth = container.clientWidth;
        newHeight = container.clientHeight;
    } else {
        const parentElement = canvasElement.parentElement;
        if (parentElement && parentElement.clientWidth > 50 && parentElement.clientHeight > 50) {
            newWidth = parentElement.clientWidth;
            newHeight = parentElement.clientHeight;
        } else {
            
            newWidth = DEFAULT_CANVAS_WIDTH;
            newHeight = DEFAULT_CANVAS_HEIGHT;
        }
    }
    canvasElement.width = newWidth;
    canvasElement.height = newHeight;
    planeParams.width = canvasElement.width;
    planeParams.height = canvasElement.height;

    sphereViewObj.radius = Math.min(planeParams.width, planeParams.height) / 2 * SPHERE_VIEW_RADIUS_FACTOR;
    sphereViewObj.centerX = planeParams.width / 2;
    sphereViewObj.centerY = planeParams.height / 2;

    const domainColorCanvas = (canvasElement === zCanvas) ? zDomainColorCanvas : wDomainColorCanvas;
    domainColorCanvas.width = planeParams.width;
    domainColorCanvas.height = planeParams.height;
}

function setupVisualParameters(updateZFromSlider = true, updateWFromSlider = true) {
    const zIsFullscreen = state.isZFullScreen;
    const wIsFullscreen = state.isWFullScreen;

    let zWorldCenterX = (zPlaneParams.currentVisXRange[0] + zPlaneParams.currentVisXRange[1]) / 2;
    let zWorldCenterY = (zPlaneParams.currentVisYRange[0] + zPlaneParams.currentVisYRange[1]) / 2;
    let wWorldCenterX = (wPlaneParams.xRange[0] + wPlaneParams.xRange[1]) / 2;
    let wWorldCenterY = (wPlaneParams.yRange[0] + wPlaneParams.yRange[1]) / 2;

    setupCanvasBaseParams(zPlaneParams, zCanvas, sphereViewParams.z, zIsFullscreen);
    setupCanvasBaseParams(wPlaneParams, wCanvas, sphereViewParams.w, wIsFullscreen);

    if (updateZFromSlider) { 
        const zoomZ = state.zPlaneZoom;
        const initialXSpanZ = zPlaneInitialRanges.x[1] - zPlaneInitialRanges.x[0];
        const initialYSpanZ = zPlaneInitialRanges.y[1] - zPlaneInitialRanges.y[0];
        const currentXSpanZ = initialXSpanZ / zoomZ;
        const currentYSpanZ = initialYSpanZ / zoomZ;
        zWorldCenterX = (zPlaneInitialRanges.x[0] + zPlaneInitialRanges.x[1]) / 2; 
        zWorldCenterY = (zPlaneInitialRanges.y[0] + zPlaneInitialRanges.y[1]) / 2;
        zPlaneParams.currentVisXRange[0] = zWorldCenterX - currentXSpanZ / 2;
        zPlaneParams.currentVisXRange[1] = zWorldCenterX + currentXSpanZ / 2;
        zPlaneParams.currentVisYRange[0] = zWorldCenterY - currentYSpanZ / 2;
        zPlaneParams.currentVisYRange[1] = zWorldCenterY + currentYSpanZ / 2;
    }
    const xSpanZ = zPlaneParams.currentVisXRange[1] - zPlaneParams.currentVisXRange[0];
    const ySpanZ = zPlaneParams.currentVisYRange[1] - zPlaneParams.currentVisYRange[0];
    if (xSpanZ === 0 || ySpanZ === 0) { return; }
    const scaleXZ = zPlaneParams.width / xSpanZ;
    const scaleYZ = zPlaneParams.height / ySpanZ;
    zPlaneParams.scale.x = zPlaneParams.scale.y = Math.min(scaleXZ, scaleYZ); 
    zPlaneParams.origin.x = (zPlaneParams.width / 2) - zWorldCenterX * zPlaneParams.scale.x;
    zPlaneParams.origin.y = (zPlaneParams.height / 2) + zWorldCenterY * zPlaneParams.scale.y; 
    updatePlaneViewportRanges(zPlaneParams); 

    if (updateWFromSlider) { 
        const zoomW = state.wPlaneZoom;
        const initialXSpanW = wPlaneInitialRanges.x[1] - wPlaneInitialRanges.x[0];
        const initialYSpanW = wPlaneInitialRanges.y[1] - wPlaneInitialRanges.y[0];
        const currentXSpanW = initialXSpanW / zoomW;
        const currentYSpanW = initialYSpanW / zoomW;
        wWorldCenterX = (wPlaneInitialRanges.x[0] + wPlaneInitialRanges.x[1]) / 2; 
        wWorldCenterY = (wPlaneInitialRanges.y[0] + wPlaneInitialRanges.y[1]) / 2;
        wPlaneParams.xRange[0] = wWorldCenterX - currentXSpanW / 2;
        wPlaneParams.xRange[1] = wWorldCenterX + currentXSpanW / 2;
        wPlaneParams.yRange[0] = wWorldCenterY - currentYSpanW / 2;
        wPlaneParams.yRange[1] = wWorldCenterY + currentYSpanW / 2;
    }
    const xSpanW = wPlaneParams.xRange[1] - wPlaneParams.xRange[0];
    const ySpanW = wPlaneParams.yRange[1] - wPlaneParams.yRange[0];
    if (xSpanW === 0 || ySpanW === 0) { return; }
    const scaleXW = wPlaneParams.width / xSpanW;
    const scaleYW = wPlaneParams.height / ySpanW;
    wPlaneParams.scale.x = wPlaneParams.scale.y = Math.min(scaleXW, scaleYW);
    wPlaneParams.origin.x = (wPlaneParams.width / 2) - wWorldCenterX * wPlaneParams.scale.x;
    wPlaneParams.origin.y = (wPlaneParams.height / 2) + wWorldCenterY * wPlaneParams.scale.y;
    updatePlaneViewportRanges(wPlaneParams);
}
