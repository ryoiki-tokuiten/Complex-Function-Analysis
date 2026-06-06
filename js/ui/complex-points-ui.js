// js/ui/complex-points-ui.js

export class ComplexPointsUI {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) {
            console.error("ComplexPointsUI: Container element not found.", container);
            return;
        }

        this.multiple = options.multiple || false;
        this.onChange = options.onChange || (() => {});
        this.presets = options.presets || [];
        this.points = options.initialPoints ? [...options.initialPoints] : [];

        // Internal values for custom inputs
        this.customRe = 0;
        this.customIm = 0;

        // Render base HTML structure
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = '';

        // Preset Groups container
        const presetGroupsContainer = document.createElement('div');
        presetGroupsContainer.className = 'taylor-series-preset-groups';
        presetGroupsContainer.style.marginBottom = '0.85rem';

        this.presets.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = 'taylor-series-preset-group';

            const groupTitle = document.createElement('div');
            groupTitle.className = 'taylor-series-preset-group-title';
            groupTitle.textContent = group.label;
            groupEl.appendChild(groupTitle);

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'taylor-series-preset-buttons';

            group.presets.forEach(preset => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'taylor-series-preset-btn';
                btn.textContent = preset.label;
                btn.dataset.re = String(preset.re);
                btn.dataset.im = String(preset.im);
                
                // Set active class if selected
                if (this.isPointSelected(preset.re, preset.im)) {
                    btn.classList.add('toggle-active');
                }

                buttonsContainer.appendChild(btn);
            });

            groupEl.appendChild(buttonsContainer);
            presetGroupsContainer.appendChild(groupEl);
        });

        this.container.appendChild(presetGroupsContainer);

        // Custom Inputs row
        const inputRow = document.createElement('div');
        inputRow.className = 'taylor-series-input-row';
        inputRow.style.gap = '0.75rem';

        const reField = document.createElement('label');
        reField.className = 'taylor-series-input-field';
        const reCaption = document.createElement('span');
        reCaption.className = 'taylor-series-input-caption';
        reCaption.textContent = this.multiple ? 'Point Re(z)' : 'Center Re(z0)';
        reField.appendChild(reCaption);

        const reInput = document.createElement('input');
        reInput.type = 'text';
        reInput.className = 'small-number-input taylor-series-text-input';
        reInput.value = this.multiple ? String(this.customRe) : (this.points[0] ? this.formatNumericValue(this.points[0].re) : '0');
        reField.appendChild(reInput);
        this.reInput = reInput;

        const imField = document.createElement('label');
        imField.className = 'taylor-series-input-field';
        const imCaption = document.createElement('span');
        imCaption.className = 'taylor-series-input-caption';
        imCaption.textContent = this.multiple ? 'Point Im(z)' : 'Center Im(z0)';
        imField.appendChild(imCaption);

        const imInput = document.createElement('input');
        imInput.type = 'text';
        imInput.className = 'small-number-input taylor-series-text-input';
        imInput.value = this.multiple ? String(this.customIm) : (this.points[0] ? this.formatNumericValue(this.points[0].im) : '0');
        imField.appendChild(imInput);
        this.imInput = imInput;

        inputRow.appendChild(reField);
        inputRow.appendChild(imField);
        this.container.appendChild(inputRow);

        // If multiple-select, add the "Add Point" button and the active points list (chips)
        if (this.multiple) {
            // Add point button
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'sidebar-button';
            addBtn.style.marginTop = '0.75rem';
            addBtn.style.width = '100%';
            addBtn.style.display = 'flex';
            addBtn.style.alignItems = 'center';
            addBtn.style.justifyContent = 'center';
            addBtn.style.gap = '0.5rem';
            addBtn.innerHTML = '<span class="icon">＋</span> Add Point';
            this.container.appendChild(addBtn);
            this.addBtn = addBtn;

            // Chips Container
            const chipsWrapper = document.createElement('div');
            chipsWrapper.className = 'complex-points-chips-wrapper';
            chipsWrapper.style.marginTop = '0.85rem';
            
            const chipsHeader = document.createElement('div');
            chipsHeader.style.display = 'flex';
            chipsHeader.style.justifyContent = 'space-between';
            chipsHeader.style.alignItems = 'center';
            chipsHeader.style.marginBottom = '0.45rem';
            
            const chipsTitle = document.createElement('span');
            chipsTitle.className = 'taylor-series-preset-group-title';
            chipsTitle.textContent = 'Placed Points';
            chipsHeader.appendChild(chipsTitle);

            const clearAllBtn = document.createElement('button');
            clearAllBtn.type = 'button';
            clearAllBtn.className = 'complex-points-clear-btn';
            clearAllBtn.textContent = 'Clear All';
            chipsHeader.appendChild(clearAllBtn);
            this.clearAllBtn = clearAllBtn;

            chipsWrapper.appendChild(chipsHeader);

            const chipsContainer = document.createElement('div');
            chipsContainer.className = 'complex-points-chips-container';
            chipsWrapper.appendChild(chipsContainer);
            this.chipsContainer = chipsContainer;

            this.container.appendChild(chipsWrapper);
            this.chipsWrapper = chipsWrapper;

            this.updateChips();
        }
    }

    isPointSelected(re, im) {
        return this.points.some(p => Math.abs(p.re - re) < 1e-9 && Math.abs(p.im - im) < 1e-9);
    }

    formatNumericValue(val) {
        if (typeof formatTaylorNumericValue === 'function') {
            return formatTaylorNumericValue(val);
        }
        if (val === 0) return '0';
        return val.toFixed(3);
    }

    updateChips() {
        if (!this.chipsContainer) return;

        this.chipsContainer.innerHTML = '';
        if (this.points.length === 0) {
            this.chipsWrapper.style.display = 'none';
            return;
        }
        this.chipsWrapper.style.display = 'block';

        this.points.forEach((point, index) => {
            const chip = document.createElement('div');
            chip.className = 'complex-points-chip';

            // Find label if it's a preset
            let label = this.getPointLabel(point.re, point.im);
            chip.textContent = label;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'complex-points-chip-remove';
            removeBtn.innerHTML = '✖';
            removeBtn.dataset.index = String(index);
            chip.appendChild(removeBtn);

            this.chipsContainer.appendChild(chip);
        });
    }

    getPointLabel(re, im) {
        // Try to find in presets
        for (const group of this.presets) {
            for (const preset of group.presets) {
                if (Math.abs(preset.re - re) < 1e-9 && Math.abs(preset.im - im) < 1e-9) {
                    return preset.label;
                }
            }
        }
        
        // Custom label format: re + im * i
        const formattedRe = re.toFixed(2).replace(/\.?0+$/, '');
        const formattedIm = im.toFixed(2).replace(/\.?0+$/, '');
        if (im === 0) return formattedRe;
        if (re === 0) {
            if (im === 1) return 'i';
            if (im === -1) return '-i';
            return `${formattedIm}i`;
        }
        const sign = im > 0 ? '+' : '-';
        const absIm = Math.abs(im);
        const imPart = absIm === 1 ? 'i' : `${absIm.toFixed(2).replace(/\.?0+$/, '')}i`;
        return `${formattedRe}${sign}${imPart}`;
    }

    updateHighlightStates() {
        const buttons = this.container.querySelectorAll('.taylor-series-preset-btn');
        buttons.forEach(button => {
            const re = parseFloat(button.dataset.re);
            const im = parseFloat(button.dataset.im);
            const isSelected = this.isPointSelected(re, im);
            button.classList.toggle('toggle-active', isSelected);
        });
    }

    setPoints(points, triggerChange = true) {
        this.points = [...points];
        if (!this.multiple) {
            const p = this.points[0] || { re: 0, im: 0 };
            if (this.reInput && document.activeElement !== this.reInput) {
                this.reInput.value = this.formatNumericValue(p.re);
            }
            if (this.imInput && document.activeElement !== this.imInput) {
                this.imInput.value = this.formatNumericValue(p.im);
            }
        } else {
            this.updateChips();
        }
        this.updateHighlightStates();
        if (triggerChange) {
            this.onChange(this.points);
        }
    }

    bindEvents() {
        // Preset clicks
        this.container.addEventListener('click', event => {
            const btn = event.target.closest('.taylor-series-preset-btn');
            if (btn) {
                const re = parseFloat(btn.dataset.re);
                const im = parseFloat(btn.dataset.im);
                if (this.multiple) {
                    // Toggle point
                    const isSelected = this.isPointSelected(re, im);
                    if (isSelected) {
                        this.setPoints(this.points.filter(p => !(Math.abs(p.re - re) < 1e-9 && Math.abs(p.im - im) < 1e-9)));
                    } else {
                        this.setPoints([...this.points, { re, im }]);
                    }
                } else {
                    // Select single point
                    this.setPoints([{ re, im }]);
                }
                return;
            }

            // Chip remove click
            const removeBtn = event.target.closest('.complex-points-chip-remove');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index, 10);
                if (!Number.isNaN(index)) {
                    this.setPoints(this.points.filter((_, i) => i !== index));
                }
                return;
            }

            // Clear all click
            if (event.target === this.clearAllBtn) {
                this.setPoints([]);
                return;
            }

            // Add Custom Point click
            if (event.target === this.addBtn) {
                const re = parseFloat(this.reInput.value);
                const im = parseFloat(this.imInput.value);
                if (!Number.isNaN(re) && !Number.isNaN(im)) {
                    // Add only if not already exists to avoid duplicates
                    if (!this.isPointSelected(re, im)) {
                        this.setPoints([...this.points, { re, im }]);
                    }
                }
            }
        });

        // Custom Inputs key/change behavior
        const handleInputChange = () => {
            if (!this.multiple) {
                const re = parseFloat(this.reInput.value);
                const im = parseFloat(this.imInput.value);
                this.points = [{ re: Number.isNaN(re) ? 0 : re, im: Number.isNaN(im) ? 0 : im }];
                this.updateHighlightStates();
                this.onChange(this.points);
            } else {
                this.customRe = parseFloat(this.reInput.value) || 0;
                this.customIm = parseFloat(this.imInput.value) || 0;
            }
        };

        this.reInput.addEventListener('input', handleInputChange);
        this.imInput.addEventListener('input', handleInputChange);
        this.reInput.addEventListener('change', handleInputChange);
        this.imInput.addEventListener('change', handleInputChange);
    }
}
