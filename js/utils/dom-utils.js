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
    controls.zCanvasCard = document.getElementById('z_plane_column'); 
    controls.wCanvasCard = document.getElementById('w_plane_column'); 
    controls.toggleFullscreenZBtn = document.getElementById('toggle_fullscreen_z_btn'); controls.toggleFullscreenWBtn = document.getElementById('toggle_fullscreen_w_btn');
    controls.fullscreenContainer = document.getElementById('fullscreen_container'); 
    controls.closeFullscreenBtn = document.getElementById('close_fullscreen_btn'); 

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

    controls.commonParamsSliders = document.getElementById('common_params_sliders');
    controls.shapeParamsSliders = document.getElementById('shape_params_sliders');
    controls.mobiusParamsSliders = document.getElementById('mobius_params_sliders');
    controls.polynomialParamsSliders = document.getElementById('polynomial_params_sliders');
    controls.polynomialNSlider = document.getElementById('polynomialN_slider');
    controls.polynomialNValueDisplay = document.getElementById('polynomialN_value_display');
    controls.polynomialCoeffsContainer = document.getElementById('polynomial_coeffs_container');
    controls.circleRSliderGroup = document.getElementById('circleR_slider_group');
    controls.ellipseParamsSliderGroup = document.getElementById('ellipse_params_slider_group');
    controls.hyperbolaParamsSliderGroup = document.getElementById('hyperbola_params_slider_group');
    controls.stripHorizontalParamsSliders = document.getElementById('strip_horizontal_params_sliders');
    controls.stripY1Slider = document.getElementById('stripY1_slider'); controls.stripY1ValueDisplay = document.getElementById('stripY1_value_display');
    controls.stripY2Slider = document.getElementById('stripY2_slider'); controls.stripY2ValueDisplay = document.getElementById('stripY2_value_display');
    controls.sectorAngularParamsSliders = document.getElementById('sector_angular_params_sliders');

    
    ['A', 'B', 'C', 'D'].forEach(param => {
        ['re', 'im'].forEach(part => {
            controls[`mobius${param}_${part}_slider`] = document.getElementById(`mobius${param}_${part}_slider`);
            controls[`mobius${param}_${part}_value_display`] = document.getElementById(`mobius${param}_${part}_value_display`);
            controls[`play_mobius${param}_${part}_btn`] = document.getElementById(`play_mobius${param}_${part}_btn`);
            controls[`speed_mobius${param}_${part}_selector`] = document.getElementById(`speed_mobius${param}_${part}_selector`);
        });
    });

    controls.sectorAngle1Slider = document.getElementById('sectorAngle1_slider'); controls.sectorAngle1ValueDisplay = document.getElementById('sectorAngle1_value_display');
    controls.sectorAngle2Slider = document.getElementById('sectorAngle2_slider'); controls.sectorAngle2ValueDisplay = document.getElementById('sectorAngle2_value_display');
    controls.sectorRMinSlider = document.getElementById('sectorRMin_slider'); controls.sectorRMinValueDisplay = document.getElementById('sectorRMin_value_display');
    controls.sectorRMaxSlider = document.getElementById('sectorRMax_slider'); controls.sectorRMaxValueDisplay = document.getElementById('sectorRMax_value_display');

    controls.inputShapeSelector = document.getElementById('input_shape_selector');
    controls.funcButtons = {};
    ['fourier', 'laplace', 'cos', 'sin', 'tan', 'sec', 'exp', 'ln', 'reciprocal', 'mobius', 'zeta', 'polynomial', 'poincare'].forEach(f => { 
        controls.funcButtons[f] = document.getElementById(`select_${f}_btn`);
    });
    
    // Fourier Transform controls
    controls.fourierSpecificControlsDiv = document.getElementById('fourier_specific_controls');
    controls.fourierFunctionSelector = document.getElementById('fourier_function_selector');
    controls.fourierFrequencySlider = document.getElementById('fourier_frequency_slider');
    controls.fourierFrequencyValueDisplay = document.getElementById('fourier_frequency_value_display');
    controls.fourierAmplitudeSlider = document.getElementById('fourier_amplitude_slider');
    controls.fourierAmplitudeValueDisplay = document.getElementById('fourier_amplitude_value_display');
    controls.fourierTimeWindowSlider = document.getElementById('fourier_time_window_slider');
    controls.fourierTimeWindowValueDisplay = document.getElementById('fourier_time_window_value_display');
    controls.fourierSamplesSlider = document.getElementById('fourier_samples_slider');
    controls.fourierSamplesValueDisplay = document.getElementById('fourier_samples_value_display');
    controls.fourierWindingFrequencySlider = document.getElementById('fourier_winding_frequency_slider');
    controls.fourierWindingFrequencyValueDisplay = document.getElementById('fourier_winding_frequency_value_display');
    controls.fourierWindingTimeSlider = document.getElementById('fourier_winding_time_slider');
    controls.fourierWindingTimeValueDisplay = document.getElementById('fourier_winding_time_value_display');
    
    // Laplace Transform controls
    controls.laplaceSpecificControlsDiv = document.getElementById('laplace_specific_controls');
    controls.laplaceFunctionSelector = document.getElementById('laplace_function_selector');
    controls.laplaceFrequencySlider = document.getElementById('laplace_frequency_slider');
    controls.laplaceFrequencyValueDisplay = document.getElementById('laplace_frequency_value_display');
    controls.laplaceDampingSlider = document.getElementById('laplace_damping_slider');
    controls.laplaceDampingValueDisplay = document.getElementById('laplace_damping_value_display');
    controls.laplaceSigmaSlider = document.getElementById('laplace_sigma_slider');
    controls.laplaceSigmaValueDisplay = document.getElementById('laplace_sigma_value_display');
    controls.laplaceOmegaSlider = document.getElementById('laplace_omega_slider');
    controls.laplaceOmegaValueDisplay = document.getElementById('laplace_omega_value_display');
    controls.laplaceShowROCCb = document.getElementById('laplace_show_roc_cb');
    controls.laplaceVizModeSelector = document.getElementById('laplace_viz_mode_selector');
    controls.laplaceClipHeightSlider = document.getElementById('laplace_clip_height_slider');
    controls.laplaceClipHeightValueDisplay = document.getElementById('laplace_clip_height_value_display');
    controls.laplaceShowPolesZerosCb = document.getElementById('laplace_show_poles_zeros_cb');
    controls.laplaceFindPolesZerosBtn = document.getElementById('laplace_find_poles_zeros_btn');
    controls.laplaceStabilityAnalysisBtn = document.getElementById('laplace_stability_analysis_btn');
    controls.laplaceStabilityDisplay = document.getElementById('laplace_stability_display');
    controls.laplaceShowFourierLineCb = document.getElementById('laplace_show_fourier_line_cb');
    
    controls.wPlaneTitleFunc = document.getElementById('w-plane-title-func');
    controls.zPlaneTitle = document.getElementById('z-plane-title');
    controls.wPlaneTitle = document.getElementById('w-plane-title');
    controls.enableDomainColoringCb = document.getElementById('enable_domain_coloring_cb');
    
    controls.domainColoringOptionsDiv = document.getElementById('domain_coloring_options_div');
    controls.domainBrightnessSlider = document.getElementById('domain_brightness_slider');
    controls.domainBrightnessValueDisplay = document.getElementById('domain_brightness_value_display');
    controls.domainContrastSlider = document.getElementById('domain_contrast_slider');
    controls.domainContrastValueDisplay = document.getElementById('domain_contrast_value_display');
    controls.domainSaturationSlider = document.getElementById('domain_saturation_slider');
    controls.domainSaturationValueDisplay = document.getElementById('domain_saturation_value_display');
    controls.domainLightnessCyclesSlider = document.getElementById('domain_lightness_cycles_slider');
    controls.domainLightnessCyclesValueDisplay = document.getElementById('domain_lightness_cycles_value_display');
    controls.domainColoringKeyDiv = document.getElementById('domain_coloring_key'); 


    controls.gridDensitySlider = document.getElementById('grid_density_slider');
    controls.gridDensityValueDisplay = document.getElementById('grid_density_value_display');
    controls.showZerosPolesCb = document.getElementById('show_zeros_poles_cb');
    controls.showCriticalPointsCb = document.getElementById('show_critical_points_cb');
    controls.neighborhoodSizeSlider = document.getElementById('neighborhood_size_slider');
    controls.neighborhoodSizeValueDisplay = document.getElementById('neighborhood_size_value_display');
    
    controls.enableRiemannSphereCb = document.getElementById('enable_riemann_sphere_cb'); 
    controls.enableTaylorSeriesCb = document.getElementById('enable_taylor_series_cb');
    controls.taylorSeriesOptionsDetailDiv = document.getElementById('taylor_series_options_detail_div');
    controls.taylorSeriesOrderSlider = document.getElementById('taylor_series_order_slider');
    controls.taylorSeriesOrderValueDisplay = document.getElementById('taylor_series_order_value_display');
    controls.enableTaylorSeriesCustomCenterCb = document.getElementById('enable_taylor_series_custom_center_cb');
    controls.taylorSeriesCustomCenterInputsDiv = document.getElementById('taylor_series_custom_center_inputs_div');
    controls.taylorSeriesCustomCenterReInput = document.getElementById('taylor_series_custom_center_re_input');
    controls.taylorSeriesCustomCenterImInput = document.getElementById('taylor_series_custom_center_im_input');
    controls.zPlaneProbeInfo = document.getElementById('z_plane_probe_info');
    controls.wPlaneProbeInfo = document.getElementById('w_plane_probe_info');
    controls.wPlaneAnalysisInfo = document.getElementById('w_plane_analysis_info');
    controls.zPlaneZoomSlider = document.getElementById('z_plane_zoom_slider');
    controls.zPlaneZoomValueDisplay = document.getElementById('z_plane_zoom_value_display');
    controls.wPlaneZoomSlider = document.getElementById('w_plane_zoom_slider');
    controls.wPlaneZoomValueDisplay = document.getElementById('w_plane_zoom_value_display');
    controls.toggleZetaContinuationBtn = document.getElementById('toggle_zeta_continuation_btn');
    controls.zetaSpecificControlsDiv = document.getElementById('zeta_specific_controls');
    controls.enableVectorFieldCb = document.getElementById('enable_vector_field_cb');
    controls.vectorFieldOptionsDiv = document.getElementById('vector_field_options_div');
    controls.vectorFieldFunctionSelector = document.getElementById('vector_field_function_selector');
    controls.vectorFieldScaleSlider = document.getElementById('vector_field_scale_slider');
    controls.vectorFieldScaleValueDisplay = document.getElementById('vector_field_scale_value_display');
    controls.enableCauchyIntegralModeCb = document.getElementById('enable_cauchy_integral_mode_cb');
    controls.cauchy_integral_results_info = document.getElementById('cauchy_integral_results_info');

    
    controls.enableRadialDiscreteStepsCb = document.getElementById('enable_radial_discrete_steps_cb');
    controls.radialDiscreteStepsOptionsDiv = document.getElementById('radial_discrete_steps_options_div');
    controls.radialDiscreteStepsCountSlider = document.getElementById('radial_discrete_steps_count_slider');
    controls.radialDiscreteStepsCountValueDisplay = document.getElementById('radial_discrete_steps_count_value_display');

    
    controls.enableSplitViewCb = document.getElementById('enable_split_view_cb');
    controls.sphereViewControlsDiv = document.getElementById('sphere_view_controls_div');
    ['sphere_view_north_btn', 'sphere_view_south_btn', 'sphere_view_east_btn', 'sphere_view_west_btn', 'sphere_view_front_btn', 'sphere_view_reset_btn'].forEach(id => {
        controls[id] = document.getElementById(id);
    });

    
    controls.showVectorFieldPanelCb = document.getElementById('show_vector_field_panel_cb');
    controls.vectorFlowOptionsContent = document.getElementById('vector_flow_options_content');
    controls.enableDomainColoringCb = document.getElementById('enable_domain_coloring_cb');
    controls.domainColoringOptionsDiv = document.getElementById('domain_coloring_options_div');
    controls.domainBrightnessSlider = document.getElementById('domain_brightness_slider');
    controls.domainBrightnessValueDisplay = document.getElementById('domain_brightness_value_display');
    controls.domainContrastSlider = document.getElementById('domain_contrast_slider');
    controls.domainContrastValueDisplay = document.getElementById('domain_contrast_value_display');
    controls.domainSaturationSlider = document.getElementById('domain_saturation_slider');
    controls.domainSaturationValueDisplay = document.getElementById('domain_saturation_value_display');
    controls.domainLightnessCyclesSlider = document.getElementById('domain_lightness_cycles_slider');
    controls.domainLightnessCyclesValueDisplay = document.getElementById('domain_lightness_cycles_value_display');
    controls.showZerosPolesCb = document.getElementById('show_zeros_poles_cb');
    controls.showCriticalPointsCb = document.getElementById('show_critical_points_cb');
    controls.enableRadialDiscreteStepsCb = document.getElementById('enable_radial_discrete_steps_cb');
    controls.radialDiscreteStepsOptionsDiv = document.getElementById('radial_discrete_steps_options_div');
    controls.radialDiscreteStepsCountSlider = document.getElementById('radial_discrete_steps_count_slider');
    controls.radialDiscreteStepsCountValueDisplay = document.getElementById('radial_discrete_steps_count_value_display');
    controls.enableCauchyIntegralModeCb = document.getElementById('enable_cauchy_integral_mode_cb');
    controls.cauchyIntegralResultsInfo = document.getElementById('cauchy_integral_results_info');
    controls.enableTaylorSeriesCb = document.getElementById('enable_taylor_series_cb');
    controls.taylorSeriesOptionsDetailDiv = document.getElementById('taylor_series_options_detail_div');
    controls.taylorSeriesOrderSlider = document.getElementById('taylor_series_order_slider');
    controls.taylorSeriesOrderValueDisplay = document.getElementById('taylor_series_order_value_display');
    controls.enableTaylorSeriesCustomCenterCb = document.getElementById('enable_taylor_series_custom_center_cb');
    controls.taylorSeriesCustomCenterInputsDiv = document.getElementById('taylor_series_custom_center_inputs_div');
    controls.taylorSeriesCustomCenterReInput = document.getElementById('taylor_series_custom_center_re_input');
    controls.taylorSeriesCustomCenterImInput = document.getElementById('taylor_series_custom_center_im_input');
    controls.enableRiemannSphereCb = document.getElementById('enable_riemann_sphere_cb');
    controls.enableSplitViewCb = document.getElementById('enable_split_view_cb');
    controls.sphereViewNorthBtn = document.getElementById('sphere_view_north_btn');
    controls.sphereViewSouthBtn = document.getElementById('sphere_view_south_btn');
    controls.sphereViewEastBtn = document.getElementById('sphere_view_east_btn');
    controls.sphereViewWestBtn = document.getElementById('sphere_view_west_btn');
    controls.sphereViewFrontBtn = document.getElementById('sphere_view_front_btn');
    controls.sphereViewResetBtn = document.getElementById('sphere_view_reset_btn');
    controls.enableVectorFieldCb = document.getElementById('enable_vector_field_cb');
    controls.vectorFieldOptionsDiv = document.getElementById('vector_field_options_div');
    controls.vectorFieldFunctionSelector = document.getElementById('vector_field_function_selector');
    controls.vectorFieldScaleSlider = document.getElementById('vector_field_scale_slider');
    controls.vectorFieldScaleValueDisplay = document.getElementById('vector_field_scale_value_display');
    controls.vectorArrowThicknessSlider = document.getElementById('vector_arrow_thickness_slider');
    controls.vectorArrowThicknessValueDisplay = document.getElementById('vector_arrow_thickness_value_display');
    controls.vectorArrowHeadSizeSlider = document.getElementById('vector_arrow_head_size_slider');
    controls.vectorArrowHeadSizeValueDisplay = document.getElementById('vector_arrow_head_size_value_display');
    controls.enableStreamlineFlowCb = document.getElementById('enable_streamline_flow_cb');
    controls.streamlineOptionsDetailsDiv = document.getElementById('streamline_options_details_div');
    controls.clearManualSeedsBtn = document.getElementById('clear_manual_seeds_btn');
    controls.streamlineStepSizeSlider = document.getElementById('streamline_step_size_slider');
    controls.streamlineStepSizeValueDisplay = document.getElementById('streamline_step_size_value_display');
    controls.streamlineMaxLengthSlider = document.getElementById('streamline_max_length_slider');
    controls.streamlineMaxLengthValueDisplay = document.getElementById('streamline_max_length_value_display');
    controls.streamlineThicknessSlider = document.getElementById('streamline_thickness_slider');
    controls.streamlineThicknessValueDisplay = document.getElementById('streamline_thickness_value_display');
    controls.streamlineSeedDensityFactorSlider = document.getElementById('streamline_seed_density_factor_slider');
    controls.streamlineSeedDensityFactorValueDisplay = document.getElementById('streamline_seed_density_factor_value_display');
    controls.enableParticleAnimationCb = document.getElementById('enable_particle_animation_cb');
    controls.particleAnimationDetailsDiv = document.getElementById('particle_animation_details_div');
    controls.particleDensitySlider = document.getElementById('particle_density_slider');
    controls.particleDensityValueDisplay = document.getElementById('particle_density_value_display');
    controls.particleSpeedSlider = document.getElementById('particle_speed_slider');
    controls.particleSpeedValueDisplay = document.getElementById('particle_speed_value_display');
    controls.particleMaxLifetimeSlider = document.getElementById('particle_max_lifetime_slider');
    controls.particleMaxLifetimeValueDisplay = document.getElementById('particle_max_lifetime_value_display');

    // Add references for the main panels
    controls.functionControlsPanel = document.getElementById('function-controls-panel');
    controls.visualizationOptionsPanel = document.getElementById('visualization-options-panel');
    
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
