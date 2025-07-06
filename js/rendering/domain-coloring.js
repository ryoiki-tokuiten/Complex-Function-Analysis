function getHSLColor(ph, lM, bF = 1, brightness = 1.0, contrast = 1.0, lightnessCycles = 1.0, saturation = 1.0) {
    const h = ((ph + Math.PI) / (2 * Math.PI)) * 360; 

    
    let l_base_angle = (lM / Math.log(2)) * lightnessCycles * 2 * Math.PI;
    let l_base = 0.5 + Math.sin(l_base_angle) * 0.25; 
    if (lM < -10) l_base = 0; 

    
    let l_contrasted = 0.5 + (l_base - 0.5) * contrast;
    
    
    let l_final = l_contrasted * brightness;

    
    l_final *= bF;

    
    l_final = Math.max(0.05, Math.min(0.95, l_final));

    
    const s_final = Math.max(0, Math.min(1, saturation)); 

    return `hsl(${h.toFixed(1)}, ${s_final * 100}%, ${l_final * 100}%)`;
}

function hslToRgb(hslStr){const m=hslStr.match(/hsl\((\d+\.?\d*), *(\d+\.?\d*)%, *(\d+\.?\d*)%\)/);if(!m)return{r:0,g:0,b:0};let h=parseFloat(m[1]),s=parseFloat(m[2])/100,l=parseFloat(m[3])/100;let c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),md=l-c/2,r=0,g=0,b=0;if(0<=h&&h<60){r=c;g=x;b=0;}else if(60<=h&&h<120){r=x;g=c;b=0;}else if(120<=h&&h<180){r=0;g=c;b=x;}else if(180<=h&&h<240){r=0;g=x;b=c;}else if(240<=h&&h<300){r=x;g=0;b=c;}else if(300<=h&&h<360){r=c;g=0;b=x;}return{r:Math.round((r+md)*255),g:Math.round((g+md)*255),b:Math.round((b+md)*255)};}

function renderPlanarDomainColoring(tCtx,pP,isWPC,sTF){ 
    const w=pP.width;const h=pP.height;if(w===0||h===0)return;
    const iD=tCtx.createImageData(w,h);const d=iD.data;const det=1; 
    for(let py=0;py<h;py+=det){
        for(let px=0;px<w;px+=det){
            const planeCoords=mapCanvasToWorldCoords(px+det/2,py+det/2,pP); 
            let valueToColor;

            if(isWPC){ 
                valueToColor = {re:planeCoords.x, im:planeCoords.y};
            } else { 
                if(sTF){ 
                    if(state.currentFunction==='zeta'&&!state.zetaContinuationEnabled&&planeCoords.x<=ZETA_REFLECTION_POINT_RE){
                        valueToColor={re:NaN,im:NaN}; 
                    }else{
                        valueToColor=sTF(planeCoords.x,planeCoords.y); 
                    }
                } else { 
                    valueToColor={re:planeCoords.x,im:planeCoords.y}; 
                }
            }

            if(isNaN(valueToColor.re)||isNaN(valueToColor.im)||!isFinite(valueToColor.re)||!isFinite(valueToColor.im))continue;
            
            const phase=Math.atan2(valueToColor.im,valueToColor.re);
            const mod=Math.sqrt(valueToColor.re*valueToColor.re+valueToColor.im*valueToColor.im);
            const logMod=Math.log(1+mod); 
            
            const hslC = getHSLColor(phase, logMod, 1.0, state.domainBrightness, state.domainContrast, state.domainLightnessCycles, state.domainSaturation);
            const rgb=hslToRgb(hslC);

            for(let dy=0;dy<det;dy++){
                for(let dx=0;dx<det;dx++){
                    if(py+dy<h&&px+dx<w){
                        const idx=((py+dy)*w+(px+dx))*4;
                        d[idx]=rgb.r;d[idx+1]=rgb.g;d[idx+2]=rgb.b;d[idx+3]=255;
                    }
                }
            }
        }
    }
    tCtx.putImageData(iD,0,0);
}

function renderSphereDomainColoring(tCtx,cSP,cDOMP,isWPC,sTF){ 
    const w=cDOMP.width;const h=cDOMP.height;if(w===0||h===0)return;
    const iD=tCtx.createImageData(w,h);const d=iD.data;const det=1; 
    const{centerX:sCX,centerY:sCY,radius:sR,rotX,rotY}=cSP;

    const L_raw = SPHERE_LIGHT_DIRECTION_CAMERA;
    const L_mag = Math.sqrt(L_raw.x*L_raw.x + L_raw.y*L_raw.y + L_raw.z*L_raw.z);
    const L_norm = (L_mag === 0) ? {x:0, y:0, z:1} : {x: L_raw.x/L_mag, y: L_raw.y/L_mag, z: L_raw.z/L_mag};

    for(let py=0;py<h;py+=det){
        for(let px=0;px<w;px+=det){
            const nX=(px+det/2-sCX)/sR; 
            const nY=-(py+det/2-sCY)/sR;
            
            if(nX*nX+nY*nY<=1){ 
                const pZ_front_hemisphere=Math.sqrt(1-nX*nX-nY*nY);
                const N_cam={x:nX,y:nY,z:pZ_front_hemisphere};
                const pU_sphere=inverseRotate3D(N_cam,rotX,rotY);
                
                const complexValOnSphere = sphereToComplex(pU_sphere); 
                let valueToColor;

                if(isWPC){ 
                    valueToColor = complexValOnSphere;
                }else{ 
                    if(sTF){ 
                        if(state.currentFunction==='zeta'&&!state.zetaContinuationEnabled&&complexValOnSphere.re<=ZETA_REFLECTION_POINT_RE){
                            valueToColor={re:NaN,im:NaN};
                        }else{
                            valueToColor=sTF(complexValOnSphere.re,complexValOnSphere.im); 
                        }
                    } else { 
                         valueToColor = complexValOnSphere; 
                    }
                }

                if(isNaN(valueToColor.re)||isNaN(valueToColor.im)||!isFinite(valueToColor.re)||!isFinite(valueToColor.im)) continue;

                const phase=Math.atan2(valueToColor.im,valueToColor.re);
                const mod=Math.sqrt(valueToColor.re*valueToColor.re+valueToColor.im*valueToColor.im);
                const logMod=Math.log(1+mod);

                const N_dot_L = N_cam.x * L_norm.x + N_cam.y * L_norm.y + N_cam.z * L_norm.z;
                const diffuseFactor = Math.max(0, N_dot_L);
                let specularFactor = 0;
                if (N_dot_L > 0) {
                    const R_x = 2 * N_dot_L * N_cam.x - L_norm.x;
                    const R_y = 2 * N_dot_L * N_cam.y - L_norm.y;
                    const R_z = 2 * N_dot_L * N_cam.z - L_norm.z;
                    specularFactor = Math.pow(Math.max(0, R_z), SPHERE_TEXTURE_SHININESS_FACTOR);
                }
                const lightIntensity = SPHERE_TEXTURE_AMBIENT_INTENSITY + 
                                       SPHERE_TEXTURE_DIFFUSE_INTENSITY * diffuseFactor +
                                       SPHERE_TEXTURE_SPECULAR_INTENSITY * specularFactor;
                const clampedIntensity = Math.min(1.75, Math.max(0.1, lightIntensity));

                const hslC = getHSLColor(phase, logMod, clampedIntensity, state.domainBrightness, state.domainContrast, state.domainLightnessCycles, state.domainSaturation);
                const rgb=hslToRgb(hslC);

                for(let dy=0;dy<det;dy++){
                    for(let dx=0;dx<det;dx++){
                        if(py+dy<h&&px+dx<w){
                            const idx=((py+dy)*w+(px+dx))*4;
                            d[idx]=rgb.r;d[idx+1]=rgb.g;d[idx+2]=rgb.b;d[idx+3]=255;
                        }
                    }
                }
            }
        }
    }
    tCtx.putImageData(iD,0,0);
}
