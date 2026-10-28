'use strict';

const categories = {
    organizations: {
        title: 'Organizations',
        awards: [
            'Energy Leader of the Year - Government Entities',
            'Energy Leader of the Year - Industrial Entities',
            'Energy Leader of the Year - Commercial Entities',
            'Best Energy Conscious Community',
            'Best Energy Conscious Developer',
            'Top ESCO Company',
            'Top FM Company',
            'Best Electricity Efficiency Product / Solution',
            'Best Water Efficiency Product / Solution',
            'Best Efficient Appliances Retailer',
            'Best Energy Efficient School'
        ]
    },
    projects: {
        title: 'Projects & Campaigns',
        awards: [
            'Best Government Building Retrofitting Project',
            'Best Commercial Building Retrofitting Project',
            'Best Industrial Process Improvement Project',
            'Best Residential Building Retrofitting Project',
            'Best Energy Efficiency Awareness Campaign',
            'Best Irrigation / Water Efficiency Project',
            'Best Efficient Cooling Project / Initiative'
        ]
    },
    individuals: {
        title: 'Individuals',
        awards: [
            'Sustainable Villa of the Year',
            'Most Efficient Plants Farmer (Energy & Water Efficiency)',
            'Most Efficient Livestock Farmer (Energy & Water Efficiency)',
            'Best School Energy Champion - Student / Student Teams',
            'Top Efficient Appliances Salesperson',
            'Best Influencer',
            'Energy Champion of the Year (All Segments)'
        ]
    }
};

const form = document.getElementById('submissionForm');
const panels = Array.from(document.querySelectorAll('.form-panel'));
const categoryInput = document.getElementById('category');
const awardInput = document.getElementById('award');
const nextButton = document.getElementById('nextStep');
const backButton = document.getElementById('backStep');
const submitButton = document.getElementById('submitApplication');
const message = document.getElementById('formMessage');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const saveButton = document.getElementById('saveDraft');
const draftActions = document.getElementById('draftActions');
let currentStep = 0;
let selectedFiles = [];
let currentReceipt = null;
let databasePromise;
let draftAvailable = false;
let storageNotice = '';
let saving = false;

function showMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle('error', error);
}

function updateAwards(selectedAward = '') {
    awardInput.replaceChildren(new Option(categoryInput.value ? 'Choose your proposed award' : 'Select a category first', ''));
    const category = categories[categoryInput.value];
    awardInput.disabled = !category;
    if (category) {
        category.awards.forEach(award => awardInput.add(new Option(award, award)));
        awardInput.value = selectedAward;
    }
}

function validateStep() {
    const inputs = panels[currentStep].querySelectorAll('input, select, textarea');
    let firstInvalid;
    inputs.forEach(input => {
        if (input.required && input.type !== 'checkbox' && !input.value.trim()) {
            input.setCustomValidity('Please complete this field.');
        } else {
            input.setCustomValidity('');
        }
        const valid = input.checkValidity();
        input.setAttribute('aria-invalid', String(!valid));
        if (!valid && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
        showMessage('Please check the highlighted fields before continuing.', true);
        firstInvalid.focus();
        firstInvalid.reportValidity();
        return false;
    }
    return true;
}

function collectFields() {
    const fields = {};
    for (const [name, value] of new FormData(form)) {
        if (typeof value === 'string') fields[name] = value;
    }
    return fields;
}

function reviewRows(fields) {
    return [
        ['Applicant', `${fields.fullName || ''} / ${fields.applicantType || ''}`],
        ['Contact', `${fields.email || ''} / ${fields.phone || ''}`],
        ['Location & sector', `${fields.region || ''} / ${fields.sector || ''}`],
        ['Category', categories[fields.category]?.title || ''],
        ['Proposed award', fields.award || ''],
        ['Initiative', fields.projectTitle || ''],
        ['Your story', fields.projectDescription || ''],
        ['Electricity savings', fields.energySavings || 'Not provided'],
        ['Water savings', fields.waterSavings || 'Not provided'],
        ['Implementation period', fields.timeline || 'Not provided'],
        ['Evidence', selectedFiles.length ? selectedFiles.map(file => `${file.name} (${formatSize(file.size)})`).join('\n') : 'No attachments']
    ];
}

function renderReview() {
    const summary = document.getElementById('reviewSummary');
    summary.replaceChildren();
    reviewRows(collectFields()).forEach(([label, value]) => {
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        summary.append(term, description);
    });
}

function goToStep(index, focus = true) {
    currentStep = index;
    panels.forEach((panel, position) => { panel.hidden = position !== index; });
    document.querySelectorAll('.form-steps li').forEach((item, position) => {
        item.classList.toggle('is-current', position === index);
        item.classList.toggle('is-complete', position < index);
        if (position === index) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
    });
    backButton.hidden = index === 0;
    nextButton.hidden = index === 3;
    submitButton.hidden = index !== 3;
    document.getElementById('requiredNote').hidden = index !== 0;
    showMessage(storageNotice, Boolean(storageNotice));
    if (index === 3) renderReview();
    if (focus) {
        const legend = panels[index].querySelector('legend');
        legend.tabIndex = -1;
        legend.focus({ preventScroll: true });
        panels[index].scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }
}

nextButton.addEventListener('click', () => {
    if (validateStep()) goToStep(Math.min(currentStep + 1, 3));
});
backButton.addEventListener('click', () => goToStep(Math.max(currentStep - 1, 0)));
categoryInput.addEventListener('change', () => updateAwards());
form.addEventListener('input', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        event.target.setCustomValidity('');
        event.target.removeAttribute('aria-invalid');
    }
});

function formatSize(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFiles() {
    fileList.replaceChildren();
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('li');
        item.className = 'file-item';
        const name = document.createElement('span');
        name.textContent = file.name;
        const size = document.createElement('small');
        size.textContent = formatSize(file.size);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${file.name}`);
        remove.addEventListener('click', () => {
            selectedFiles.splice(index, 1);
            renderFiles();
            showMessage('Attachment removed from this application. Save draft to update your stored draft.');
            fileInput.focus();
        });
        item.append(name, size, remove);
        fileList.append(item);
    });
}

function addFiles(files) {
    const errors = [];
    for (const file of files) {
        if (!/\.(pdf|docx?|xlsx?|png|jpe?g)$/i.test(file.name)) {
            errors.push(`${file.name}: use PDF, Word, Excel, PNG or JPG.`);
        } else if (file.size === 0 || file.size > 10 * 1024 * 1024) {
            errors.push(`${file.name}: files must be non-empty and no larger than 10 MB.`);
        } else if (selectedFiles.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) {
            errors.push(`${file.name}: already attached.`);
        } else if (selectedFiles.length >= 5) {
            errors.push(`${file.name}: a maximum of five files is allowed.`);
        } else {
            selectedFiles.push(file);
        }
    }
    renderFiles();
    fileInput.value = '';
    showMessage(errors.length ? errors.join(' ') : `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} attached. Files stay on this device.`, errors.length > 0);
}

fileInput.addEventListener('change', () => addFiles(Array.from(fileInput.files)));
const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('dragover', event => { event.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', event => {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    addFiles(Array.from(event.dataTransfer.files));
});

function openDatabase() {
    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('This browser does not support local application storage.'));
                return;
            }
            const request = indexedDB.open('ewe-awards-preview-v2', 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('records');
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Local browser storage is unavailable. Use a browser with IndexedDB enabled.'));
            request.onblocked = () => reject(new Error('Local storage is blocked by another open awards preview. Close that preview and reload.'));
        });
    }
    return databasePromise;
}

async function storeRecord(operation, key, value) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction('records', operation === 'get' ? 'readonly' : 'readwrite');
        const store = transaction.objectStore('records');
        let request;
        if (operation === 'get') request = store.get(key);
        else if (operation === 'put') request = store.put(value, key);
        else if (operation === 'delete') request = store.delete(key);
        else request = store.clear();
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(new Error('Could not access local storage. Browser storage may be full or disabled. Your current form has not been cleared.'));
        transaction.onabort = () => reject(new Error('Local storage was interrupted. Your current form has not been cleared.'));
    });
}

function setDraftAvailable(available) {
    draftAvailable = available;
    draftActions.hidden = !available;
}

saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    try {
        await storeRecord('put', 'draft', { fields: collectFields(), files: selectedFiles, step: currentStep, savedAt: new Date().toISOString() });
        setDraftAvailable(true);
        storageNotice = '';
        showMessage('Draft and attachments saved in this browser. Nothing has been sent to TAQA.');
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        saveButton.disabled = false;
    }
});

document.getElementById('restoreDraft').addEventListener('click', async () => {
    try {
        const draft = await storeRecord('get', 'draft');
        if (!draft) throw new Error('No saved draft was found. It may have been deleted in another tab.');
        form.reset();
        for (const [name, value] of Object.entries(draft.fields)) {
            const field = form.elements.namedItem(name);
            if (field && field.type !== 'checkbox' && name !== 'award') field.value = value;
        }
        updateAwards(draft.fields.award);
        selectedFiles = draft.files || [];
        renderFiles();
        goToStep(Math.min(Math.max(draft.step || 0, 0), 3));
        showMessage('Draft and attachments restored. Please review your information and confirm the declarations again.');
    } catch (error) {
        showMessage(error.message, true);
    }
});

document.getElementById('deleteDraft').addEventListener('click', async () => {
    try {
        await storeRecord('delete', 'draft');
        setDraftAvailable(false);
        showMessage('Stored draft deleted. The information currently in the form has not been cleared.');
    } catch (error) {
        showMessage(error.message, true);
    }
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    if (currentStep !== 3) {
        if (validateStep()) goToStep(currentStep + 1);
        return;
    }
    for (let index = 0; index < panels.length; index += 1) {
        const invalid = Array.from(panels[index].querySelectorAll('input, select, textarea')).some(input =>
            !input.checkValidity() || (input.required && input.type !== 'checkbox' && !input.value.trim())
        );
        if (invalid) {
            goToStep(index);
            validateStep();
            return;
        }
    }
    saving = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving on this device...';
    try {
        const id = `DEMO-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8).toUpperCase() : Date.now().toString(36).toUpperCase()}`;
        const receipt = { id, fields: collectFields(), files: selectedFiles, savedAt: new Date().toISOString(), status: 'Local demo only - not submitted to TAQA' };
        await storeRecord('put', id, receipt);
        currentReceipt = receipt;
        form.hidden = true;
        saveButton.hidden = true;
        document.querySelector('.form-steps').hidden = true;
        draftActions.hidden = true;
        document.getElementById('receiptText').textContent = `Local reference: ${id}`;
        document.getElementById('downloadSummary').hidden = false;
        const saved = document.getElementById('savedApplication');
        saved.hidden = false;
        saved.focus();
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        saving = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Save demo application';
    }
});

function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById('downloadSummary').addEventListener('click', () => {
    if (!currentReceipt) return;
    const text = [
        'ENERGY & WATER EFFICIENCY AWARDS - DESIGN PREVIEW',
        `Local reference: ${currentReceipt.id}`,
        `Saved: ${currentReceipt.savedAt}`,
        'NOT SUBMITTED TO TAQA. This summary does not contain attachment file contents.',
        '',
        ...reviewRows(currentReceipt.fields).map(([label, value]) => `${label}\n${value}\n`)
    ].join('\r\n');
    downloadText(`${currentReceipt.id}-summary.txt`, text);
});

document.getElementById('startAgain').addEventListener('click', () => {
    form.reset();
    selectedFiles = [];
    currentReceipt = null;
    renderFiles();
    updateAwards();
    document.getElementById('savedApplication').hidden = true;
    form.hidden = false;
    saveButton.hidden = false;
    document.querySelector('.form-steps').hidden = false;
    setDraftAvailable(draftAvailable);
    goToStep(0);
});

let dialogCategory = '';
const categoryDialog = document.getElementById('categoryDialog');
document.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
        dialogCategory = button.dataset.category;
        const category = categories[dialogCategory];
        document.getElementById('dialogTitle').textContent = category.title;
        const list = document.getElementById('dialogAwards');
        list.replaceChildren();
        category.awards.forEach(award => {
            const item = document.createElement('li');
            item.textContent = award;
            list.append(item);
        });
        categoryDialog.showModal();
    });
});
document.getElementById('chooseCategory').addEventListener('click', () => {
    categoryInput.value = dialogCategory;
    updateAwards();
    categoryDialog.close();
    if (form.hidden) {
        document.getElementById('savedApplication').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    goToStep(0, false);
    document.getElementById('apply').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('applicantType').focus({ preventScroll: true });
    showMessage(`${categories[dialogCategory].title} selected. Start with your details, then choose a proposed award.`);
});

const privacyDialog = document.getElementById('privacyDialog');
document.getElementById('privacyButton').addEventListener('click', () => privacyDialog.showModal());
document.getElementById('footerPrivacy').addEventListener('click', () => privacyDialog.showModal());
document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) {
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        }
    });
});

document.getElementById('clearLocalData').addEventListener('click', async () => {
    const privacyMessage = document.getElementById('privacyMessage');
    try {
        await storeRecord('clear');
        localStorage.removeItem('ewe-awards-draft');
        setDraftAvailable(false);
        currentReceipt = null;
        if (form.hidden) {
            selectedFiles = [];
            renderFiles();
        }
        document.getElementById('downloadSummary').hidden = true;
        document.getElementById('receiptText').textContent = 'Local demo application deleted.';
        privacyMessage.textContent = 'All drafts and demo applications have been deleted from this browser. The current unsaved form and downloaded summaries are unchanged.';
    } catch (error) {
        privacyMessage.textContent = error.message;
    }
});

document.getElementById('downloadGuide').addEventListener('click', () => {
    const lines = [
        'ENERGY & WATER EFFICIENCY AWARDS',
        'PREVIEW APPLICANT GUIDE - NOT OFFICIAL ENTRY RULES',
        '',
        'Based on A1_Business Case_EWE_Awards_V2_Jan26_Clean.',
        'All award names, eligibility, judging weights, dates and phased availability require final design and approval.',
        '',
        'PURPOSE',
        'Recognize individuals and organizations conserving electricity and water in support of the Abu Dhabi Energy & Water Efficiency Strategy 2030.',
        '',
        ...Object.values(categories).flatMap(category => [category.title.toUpperCase(), ...category.awards.map(award => `- ${award}`), '']),
        'PREPARE YOUR STORY',
        'Describe your objectives, implementation period, measures, electricity/water savings and how you calculated them.',
        'Possible evidence includes before-and-after consumption, bills, reports, calculations and photographs.',
        '',
        'PROPOSED EVALUATION THEMES',
        'Savings, implementation, economics, creativity, outreach, collaboration and social impact.',
        '',
        'THIS PREVIEW',
        'Up to 5 non-empty PDF, DOC, DOCX, XLS, XLSX, PNG or JPG files, 10 MB per file.',
        'Save draft and Save demo application store data and actual attachment files only in this browser on this device.',
        'No application is sent to TAQA. Downloaded summaries include attachment names, not file contents.',
        'Official supporting documents and final submission arrangements will be published after approval.'
    ];
    downloadText('EWE-Awards-Preview-Applicant-Guide.txt', lines.join('\r\n'));
});

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    mobileNav.hidden = expanded;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
}));

async function checkDraft() {
    try {
        setDraftAvailable(Boolean(await storeRecord('get', 'draft')));
    } catch (error) {
        storageNotice = error.message;
        showMessage(storageNotice, true);
    }
}

goToStep(0, false);
checkDraft();
