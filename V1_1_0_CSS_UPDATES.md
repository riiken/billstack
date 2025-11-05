# 🎨 BillStack v1.1.0 - CSS Updates Guide

## ✅ ALREADY DONE:
- New color palette with CSS variables
- Updated body width to 420px (more compact)
- Font size optimized to 13px

---

## 📝 **SECTION-BY-SECTION UPDATES:**

Copy-paste these sections into `styles.css` to replace the old versions.

---

### 1. HEADER STYLES (Replace existing header styles)

```css
/* ==================== HEADER ==================== */
.header {
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
  padding: var(--spacing-lg);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.header-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}
```

---

### 2. BUTTON STYLES (Replace existing button styles)

```css
/* ==================== BUTTONS ==================== */
.btn-primary {
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
}

.btn-primary:hover::before {
  left: 100%;
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: white;
  color: var(--gray-700);
  border: 2px solid var(--gray-200);
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: var(--primary-600);
  color: var(--primary-600);
  background: var(--primary-50);
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--error-50);
  color: var(--error-500);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--error-500);
  color: white;
  transform: scale(1.1);
}

.btn-add-item {
  background: var(--success-50);
  color: var(--success-500);
  border: 2px dashed var(--success-500);
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s;
}

.btn-add-item:hover {
  background: var(--success-500);
  color: white;
  border-style: solid;
}
```

---

### 3. INPUT STYLES (Replace existing input styles)

```css
/* ==================== INPUTS ==================== */
input[type="text"],
input[type="email"],
input[type="tel"],
input[type="date"],
input[type="number"],
select,
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  background: white;
  color: var(--gray-900);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary-600);
  background: var(--primary-50);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

/* Success state */
input.success,
select.success {
  border-color: var(--success-500);
  background: var(--success-50);
}

input.success:focus {
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* Error state */
input.error,
select.error {
  border-color: var(--error-500);
  background: var(--error-50);
}

input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Placeholder */
::placeholder {
  color: var(--gray-400);
  font-size: 13px;
}

/* Disabled state */
input:disabled,
select:disabled,
textarea:disabled {
  background: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
  opacity: 0.6;
}
```

---

### 4. SECTION/CARD STYLES (Replace existing section styles)

```css
/* ==================== SECTIONS & CARDS ==================== */
.section {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--gray-200);
  transition: all 0.3s ease;
}

.section:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--gray-300);
}

.section h2 {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: var(--spacing-md);
  color: var(--gray-900);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.section h2::before {
  content: '';
  width: 3px;
  height: 16px;
  background: var(--primary-600);
  border-radius: 2px;
}

/* Compact section variant */
.section-compact {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
```

---

### 5. ACCORDION STYLES (Update existing accordion styles)

```css
/* ==================== ACCORDION ==================== */
.accordion-section {
  overflow: hidden;
  transition: all 0.3s ease;
}

.accordion-header {
  cursor: pointer;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  transition: all 0.2s ease;
  border-radius: var(--radius-sm);
}

.accordion-header:hover {
  color: var(--primary-600);
  background: var(--primary-50);
  padding-left: var(--spacing-sm);
  padding-right: var(--spacing-sm);
}

.accordion-icon {
  font-size: 12px;
  transition: transform 0.3s ease;
  color: var(--primary-600);
  font-weight: 700;
  background: var(--primary-50);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.accordion-section.collapsed .accordion-icon {
  transform: rotate(-90deg);
}

.accordion-content {
  max-height: 2000px;
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  opacity: 1;
}

.accordion-section.collapsed .accordion-content {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
}

.accordion-section.collapsed {
  padding-bottom: var(--spacing-sm);
}
```

---

### 6. FORM GROUPS (Update existing form-group styles)

```css
/* ==================== FORM GROUPS ==================== */
.form-group {
  margin-bottom: var(--spacing-lg);
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-700);
}

.form-group small {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: 11px;
  color: var(--gray-500);
}

.form-group.error input,
.form-group.error textarea,
.form-group.error select {
  border-color: var(--error-500);
  background-color: var(--error-50);
}

.form-group.error label {
  color: var(--error-500);
}

.error-message {
  display: none;
  margin-top: var(--spacing-xs);
  font-size: 11px;
  color: var(--error-500);
  font-weight: 500;
}

.form-group.error .error-message {
  display: block;
}

/* Inline form row */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}
```

---

### 7. TOTALS BOX (Update totals styling)

```css
/* ==================== TOTALS ==================== */
.totals-box {
  background: var(--gray-50);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  font-size: 13px;
  color: var(--gray-700);
}

.total-row.tax-row {
  color: var(--gray-600);
  font-size: 12px;
}

.total-row.total-main {
  border-top: 2px solid var(--gray-300);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-md);
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-900);
}

.total-row.total-main span:last-child {
  color: var(--primary-600);
}

.amount-words {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--primary-50);
  border-left: 3px solid var(--primary-600);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--gray-700);
  font-style: italic;
}
```

---

### 8. TOAST NOTIFICATIONS (Update toast styles)

```css
/* ==================== TOAST NOTIFICATIONS ==================== */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  padding: 12px 24px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-weight: 600;
  font-size: 13px;
  z-index: 1000;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.toast.success {
  background: var(--success-500);
  color: white;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
}

.toast.error {
  background: var(--error-500);
  color: white;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
}

.toast.info {
  background: var(--primary-600);
  color: white;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
}

.toast.warning {
  background: var(--warning-500);
  color: white;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
}
```

---

### 9. USAGE COUNTER (Update for free version)

```css
/* ==================== USAGE COUNTER ==================== */
.usage-counter {
  padding: var(--spacing-md);
  background: linear-gradient(135deg, var(--success-50) 0%, #D1FAE5 100%);
  border: 2px solid var(--success-500);
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 13px;
  color: var(--success-500);
  text-align: center;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.usage-counter::before {
  content: '🎉';
  font-size: 18px;
}
```

---

### 10. INFO BOX (Business details display)

```css
/* ==================== INFO BOX ==================== */
.info-box {
  padding: var(--spacing-lg);
  background: var(--gray-50);
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-lg);
  font-size: 12px;
  color: var(--gray-600);
  line-height: 1.6;
}

.info-box.filled {
  background: white;
  border: 2px solid var(--success-500);
  border-style: solid;
  color: var(--gray-700);
}

.info-box strong {
  color: var(--gray-900);
  font-size: 14px;
  display: block;
  margin-bottom: var(--spacing-xs);
}

.setup-prompt {
  color: var(--warning-500);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
```

---

## 🎯 **TESTING CHECKLIST:**

After applying updates, test:

- [ ] Colors look professional (indigo theme)
- [ ] Buttons have hover effects
- [ ] Inputs show focus states
- [ ] Accordions expand/collapse smoothly
- [ ] Toast notifications appear correctly
- [ ] Forms are readable and well-spaced
- [ ] Everything fits in 420px width
- [ ] Scrolling works smoothly

---

## 📝 **NEXT STEPS:**

1. Apply these CSS updates section-by-section
2. Test after each section
3. Then we'll update HTML for better structure
4. Add first-time user tour
5. Add Google Analytics
6. Package v1.1.0

---

**Want me to continue with HTML updates and user tour implementation?**
