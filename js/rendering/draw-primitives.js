function drawAxes(ctx,p,xL,yL){
    ctx.save();
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle=COLOR_AXES;ctx.fillStyle=COLOR_TEXT_ON_CANVAS;ctx.lineWidth=1;ctx.lineJoin = 'round'; ctx.lineCap = 'round';ctx.beginPath();const yOC=mapToCanvasCoords(0,0,p).y;ctx.moveTo(0,yOC);ctx.lineTo(p.width,yOC);const xOC=mapToCanvasCoords(0,0,p).x;ctx.moveTo(xOC,0);ctx.lineTo(xOC,p.height);ctx.stroke();ctx.font="11px 'SF Pro Text',sans-serif";ctx.textAlign="left";ctx.textBaseline="top";ctx.fillText(yL,xOC+5,5);ctx.textAlign="right";ctx.textBaseline="bottom";ctx.fillText(xL,p.width-5,yOC-5);ctx.font="10px 'SF Pro Text',sans-serif";const xTS=1,yTS=1;const cXR=p.currentVisXRange||p.xRange;const cYR=p.currentVisYRange||p.yRange;ctx.textAlign="center";ctx.textBaseline="top";const xS=Math.ceil(cXR[0]/xTS)*xTS;const xE=Math.floor(cXR[1]/xTS)*xTS;for(let xw=xS;xw<=xE+1e-6;xw+=xTS){if(Math.abs(xw)>Math.max(Math.abs(cXR[0]),Math.abs(cXR[1]))+xTS&&xw!==0)continue;const C=mapToCanvasCoords(xw,0,p);let l=xw.toFixed(0);if(Math.abs(xw)<1e-3)l="0";ctx.fillText(l,C.x,C.y+5);ctx.beginPath();ctx.moveTo(C.x,C.y-3);ctx.lineTo(C.x,C.y+3);ctx.stroke();}ctx.textAlign="right";ctx.textBaseline="middle";const yS=Math.ceil(cYR[0]/yTS)*yTS;const yE=Math.floor(cYR[1]/yTS)*yTS;for(let yw=yS;yw<=yE+1e-6;yw+=yTS){if(Math.abs(yw)>Math.max(Math.abs(cYR[0]),Math.abs(cYR[1]))+yTS&&yw!==0)continue;const C=mapToCanvasCoords(0,yw,p);let l=yw.toFixed(0);if(Math.abs(yw)<1e-3&&Math.abs(xOC-C.x)<p.width-10&&l!=="0")l=""; else if(Math.abs(yw)<1e-3)l="0";if(l!=="")ctx.fillText(l,C.x-5,C.y);ctx.beginPath();ctx.moveTo(C.x-3,C.y);ctx.lineTo(C.x+3,C.y);ctx.stroke();}
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    ctx.restore();
}

function drawTaylorAxes(ctx, p, colorX, colorY, labelX, labelY) {
    ctx.save();
    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    
    ctx.strokeStyle = colorY;
    ctx.beginPath();
    const xOriginCanvas = mapToCanvasCoords(0, 0, p).x;
    ctx.moveTo(xOriginCanvas, 0);
    ctx.lineTo(xOriginCanvas, p.height);
    ctx.stroke();

    
    ctx.strokeStyle = colorX;
    ctx.beginPath();
    const yOriginCanvas = mapToCanvasCoords(0, 0, p).y;
    ctx.moveTo(0, yOriginCanvas);
    ctx.lineTo(p.width, yOriginCanvas);
    ctx.stroke();

    
    ctx.fillStyle = COLOR_TEXT_ON_CANVAS; 
    ctx.font = "11px 'SF Pro Text', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(labelY, xOriginCanvas + 5, 5); 

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(labelX, p.width - 5, yOriginCanvas - 5); 

    ctx.font = "10px 'SF Pro Text', sans-serif";
    const xTickStep = 1, yTickStep = 1; 
    const currentXRange = p.currentVisXRange || p.xRange;
    const currentYRange = p.currentVisYRange || p.yRange;

    
    ctx.strokeStyle = colorX; 
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xStart = Math.ceil(currentXRange[0] / xTickStep) * xTickStep;
    const xEnd = Math.floor(currentXRange[1] / xTickStep) * xTickStep;
    for (let xw = xStart; xw <= xEnd + 1e-6; xw += xTickStep) {
        if (Math.abs(xw) > Math.max(Math.abs(currentXRange[0]), Math.abs(currentXRange[1])) + xTickStep && xw !== 0) continue;
        const canvasCoords = mapToCanvasCoords(xw, 0, p);
        let tickLabel = xw.toFixed(0);
        if (Math.abs(xw) < 1e-3) tickLabel = "0";
        ctx.fillText(tickLabel, canvasCoords.x, canvasCoords.y + 5);
        ctx.beginPath();
        ctx.moveTo(canvasCoords.x, canvasCoords.y - 3);
        ctx.lineTo(canvasCoords.x, canvasCoords.y + 3);
        ctx.stroke();
    }

    
    ctx.strokeStyle = colorY; 
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const yStart = Math.ceil(currentYRange[0] / yTickStep) * yTickStep;
    const yEnd = Math.floor(currentYRange[1] / yTickStep) * yTickStep;
    for (let yw = yStart; yw <= yEnd + 1e-6; yw += yTickStep) {
        if (Math.abs(yw) > Math.max(Math.abs(currentYRange[0]), Math.abs(currentYRange[1])) + yTickStep && yw !== 0) continue;
        const canvasCoords = mapToCanvasCoords(0, yw, p);
        let tickLabel = yw.toFixed(0);
        if (Math.abs(yw) < 1e-3 && Math.abs(xOriginCanvas - canvasCoords.x) < p.width - 10 && tickLabel !== "0") {
             
        } else if (Math.abs(yw) < 1e-3) {
            tickLabel = "0";
        }
        if (tickLabel !== "") { 
            ctx.fillText(tickLabel, canvasCoords.x - 5, canvasCoords.y);
        }
        ctx.beginPath();
        ctx.moveTo(canvasCoords.x - 3, canvasCoords.y);
        ctx.lineTo(canvasCoords.x + 3, canvasCoords.y);
        ctx.stroke();
    }

    if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = true;
    ctx.restore();
}

function drawGridLines(ctx,p){ctx.save();ctx.strokeStyle=COLOR_GRID_LINES;ctx.lineWidth=0.5;ctx.lineJoin = 'round'; ctx.lineCap = 'round';ctx.beginPath();const xTS=1,yTS=1;const cXR=p.currentVisXRange||p.xRange;const cYR=p.currentVisYRange||p.yRange;const xS=Math.ceil(cXR[0]/xTS)*xTS;const xE=Math.floor(cXR[1]/xTS)*xTS;for(let x=xS;x<=xE+1e-6;x+=xTS){if(Math.abs(x)>Math.max(Math.abs(cXR[0]),Math.abs(cXR[1]))+xTS&&x!==0)continue;const Cx=mapToCanvasCoords(x,0,p).x;ctx.moveTo(Cx,0);ctx.lineTo(Cx,p.height);}const yS=Math.ceil(cYR[0]/yTS)*yTS;const yE=Math.floor(cYR[1]/yTS)*yTS;for(let y=yS;y<=yE+1e-6;y+=yTS){if(Math.abs(y)>Math.max(Math.abs(cYR[0]),Math.abs(cYR[1]))+yTS&&y!==0)continue;const Cy=mapToCanvasCoords(0,y,p).y;ctx.moveTo(0,Cy);ctx.lineTo(p.width,Cy);}ctx.stroke();ctx.restore();}
function drawArrow(ctx, fromX, fromY, toX, toY, color = 'white', headLength = 8, lineWidth = 1.5) {ctx.save();ctx.strokeStyle = color;ctx.fillStyle = color;ctx.lineWidth = lineWidth;ctx.lineJoin = 'round'; ctx.lineCap = 'round';const angle = Math.atan2(toY - fromY, toX - fromX);ctx.beginPath();ctx.moveTo(fromX, fromY);ctx.lineTo(toX, toY);ctx.stroke();ctx.beginPath();ctx.moveTo(toX, toY);ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));ctx.closePath();ctx.fill();ctx.restore();}


function drawZerosAndPolesMarkers(ctx, planeParams) {let contourParams = null;if (state.cauchyIntegralModeEnabled && (!state.riemannSphereViewEnabled || state.splitViewEnabled) &&(state.currentInputShape === 'circle' || state.currentInputShape === 'ellipse')) {if (state.currentInputShape === 'circle') {contourParams = { type: 'circle', cx: state.a0, cy: state.b0, r: state.circleR };} else {contourParams = { type: 'ellipse', cx: state.a0, cy: state.b0, a: state.ellipseA, b: state.ellipseB };}}state.zeros.forEach(z => {const p = mapToCanvasCoords(z.re, z.im, planeParams);ctx.fillStyle = COLOR_ZERO_MARKER;ctx.beginPath();ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);ctx.fill();
    ctx.strokeStyle = 'rgba(150, 0, 0, 0.8)'; 
    ctx.lineWidth = 1;
    ctx.stroke();});state.poles.forEach(pole => {const p = mapToCanvasCoords(pole.re, pole.im, planeParams);let poleColor = COLOR_POLE_MARKER;let poleLineWidth = 2;let markRadius = 4;if (contourParams && isPointInsideContour(pole, contourParams.type, contourParams)) {poleColor = COLOR_POLE_INSIDE_CONTOUR_MARKER;poleLineWidth = 2.5;markRadius = 5;}ctx.strokeStyle = poleColor;ctx.lineWidth = poleLineWidth;ctx.lineJoin = 'round'; ctx.lineCap = 'round';ctx.beginPath();ctx.moveTo(p.x - markRadius, p.y - markRadius);ctx.lineTo(p.x + markRadius, p.y + markRadius);ctx.moveTo(p.x + markRadius, p.y - markRadius);ctx.lineTo(p.x - markRadius, p.y + markRadius);ctx.stroke();});}
function drawCriticalPointMarker(ctx, canvas_p, color) {ctx.save();ctx.fillStyle = color;ctx.strokeStyle = 'rgba(250, 250, 250, 0.85)'; ctx.lineWidth = 1.5;ctx.lineJoin = 'round'; ctx.lineCap = 'round';ctx.beginPath();ctx.moveTo(canvas_p.x, canvas_p.y - 5); ctx.lineTo(canvas_p.x + 4, canvas_p.y); ctx.lineTo(canvas_p.x, canvas_p.y + 5); ctx.lineTo(canvas_p.x - 4, canvas_p.y); ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
