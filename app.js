
const workflowPresets = {
    maintenance: {
        title: "Technical Failure Analysis",
        description: "Extracts equipment ID, component type, failure root cause, and corrective actions from raw maintenance notes.",
        sampleInput: "Komatsu HD785 truck was in the pit today. Boom hydraulic hose 24EFG6K burst under high pressure spikes near the main valve block. Caused by severe mechanical rubbing against the chassis frame. Needs immediate replacement and rerouting bracket installation.",
        schemaInstruction: `Return a valid JSON object with the following keys:
- "equipment_id" (string)
- "component_name" (string)
- "failure_mode" (string)
- "root_cause" (string)
- "severity_level" ("Low", "Medium", "High", or "Critical")
- "corrective_action" (string)`
    },
    codebug: {
        title: "Code Bug & Fix Parser",
        description: "Analyzes buggy code snippets or error logs, identifying the exact error, file, bug description, and corrected code.",
        sampleInput: "Error in app.js line 42: TypeError: Cannot read properties of undefined (reading 'length'). Occurs when user array is empty during login initialization.",
        schemaInstruction: `Return a valid JSON object with the following keys:
- "error_type" (string)
- "affected_file_or_line" (string)
- "bug_description" (string)
- "suggested_fix_explanation" (string)
- "corrected_code_snippet" (string)`
    },
    invoice: {
        title: "Invoice & Document Extractor",
        description: "Pulls vendor name, invoice date, line items, and total amounts out of messy unstructured billing text.",
        sampleInput: "Julinat Technical Services Ltd. Invoice #JT-2026-902. Date: September 28, 2026. Items: 4x 24EFG6K Hydraulic Hoses ($1,200), Fitting Adapters ($350). Total Due: $1,550 USD.",
        schemaInstruction: `Return a valid JSON object with the following keys:
- "vendor_name" (string)
- "invoice_number" (string)
- "invoice_date" (string)
- "line_items" (array of strings)
- "total_amount" (string)`
    }
};


let currentResultData = null;
let activeView = 'card'; 


const apiKeyInput = document.getElementById('apiKeyInput');
const presetSelect = document.getElementById('presetSelect');
const rawInputText = document.getElementById('rawInputText');
const runWorkflowBtn = document.getElementById('runWorkflowBtn');
const outputContainer = document.getElementById('outputContainer');
const tabCardView = document.getElementById('tabCardView');
const tabJsonView = document.getElementById('tabJsonView');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCloseBtn = document.getElementById('modalCloseBtn');


document.addEventListener('DOMContentLoaded', () => {
    
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }

    
    updatePresetSample();


    apiKeyInput.addEventListener('input', () => {
        localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
    });

    presetSelect.addEventListener('change', updatePresetSample);
    runWorkflowBtn.addEventListener('click', executeWorkflow);
    tabCardView.addEventListener('click', () => switchView('card'));
    tabJsonView.addEventListener('click', () => switchView('json'));
    clearHistoryBtn.addEventListener('click', clearOutput);
    modalCloseBtn.addEventListener('click', closeModal);
});


function updatePresetSample() {
    const selected = presetSelect.value;
    if (workflowPresets[selected]) {
        rawInputText.value = workflowPresets[selected].sampleInput;
    }
}


function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    customModal.classList.remove('hidden');
}

function closeModal() {
    customModal.classList.add('hidden');
}


function clearOutput() {
    currentResultData = null;
    outputContainer.innerHTML = `
        <div class="text-slate-400 space-y-2">
            <svg class="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <p class="text-sm font-medium text-slate-600">No workflow executed yet.</p>
            <p class="text-xs text-slate-400">Enter your API key, select a preset, paste raw text, and click execute.</p>
        </div>
    `;
}


function switchView(view) {
    activeView = view;
    if (view === 'card') {
        tabCardView.className = "px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white transition shadow-sm";
        tabJsonView.className = "px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 transition";
    } else {
        tabJsonView.className = "px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white transition shadow-sm";
        tabCardView.className = "px-3 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 transition";
    }

    if (currentResultData) {
        renderOutput(currentResultData);
    }
}


async function executeWorkflow() {
    const apiKey = apiKeyInput.value.trim();
    const rawText = rawInputText.value.trim();
    const presetKey = presetSelect.value;

    if (!apiKey) {
        showModal("API Key Required", "Please enter your Gemini API key in the configuration panel to run workflows.");
        return;
    }

    if (!rawText) {
        showModal("Input Required", "Please enter or paste some raw text to process.");
        return;
    }

    const preset = workflowPresets[presetKey];

   
    outputContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center space-y-3 py-12">
            <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-sm font-medium text-slate-600 animate-pulse-subtle">Processing through structured schema workflow...</p>
        </div>
    `;

   
    const prompt = `You are a precise data extraction and transformation engine. 
Analyze the following unstructured input text and extract information according to the requested schema.

SCHEMA INSTRUCTIONS:
${preset.schemaInstruction}

INPUT TEXT:
"""
${rawText}
"""`;

    try {
       
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const jsonString = data.candidates[0].content.parts[0].text;
        
       
        currentResultData = JSON.parse(jsonString);
        renderOutput(currentResultData);

    } catch (error) {
        outputContainer.innerHTML = `
            <div class="text-left w-full p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2">
                <h4 class="font-bold text-sm">Execution Failed</h4>
                <p class="text-xs font-mono">${error.message}</p>
            </div>
        `;
    }
}


function renderOutput(jsonData) {
    if (activeView === 'json') {
        outputContainer.innerHTML = `
            <div class="w-full text-left bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto shadow-inner">
                <pre class="text-xs font-mono"><code>${escapeHtml(JSON.stringify(jsonData, null, 2))}</code></pre>
            </div>
        `;
        return;
    }

  
    let cardsHtml = `<div class="w-full text-left space-y-3 max-h-[500px] overflow-y-auto pr-1">`;
    
    for (const [key, value] of Object.entries(jsonData)) {
        const formattedKey = key.replace(/_/g, ' ').toUpperCase();
        
        let displayVal = value;
        if (Array.isArray(value)) {
            displayVal = `<ul class="list-disc list-inside space-y-1 mt-1">${value.map(item => `<li>${escapeHtml(String(item))}</li>`).join('')}</ul>`;
        } else {
            displayVal = `<p class="text-sm font-medium text-slate-800 mt-0.5">${escapeHtml(String(value))}</p>`;
        }

      
        let badgeClass = "bg-slate-100 border-slate-200 text-slate-700";
        if (key.toLowerCase().includes('severity')) {
            const valLower = String(value).toLowerCase();
            if (valLower === 'critical' || valLower === 'high') badgeClass = "bg-rose-50 border-rose-200 text-rose-700";
            else if (valLower === 'medium') badgeClass = "bg-amber-50 border-amber-200 text-amber-700";
            else badgeClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
        }

        cardsHtml += `
            <div class="workflow-card bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
                <span class="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">${formattedKey}</span>
                <div class="${key.toLowerCase().includes('severity') ? `inline-block px-2 py-0.5 rounded text-xs font-bold border ml-2 ${badgeClass}` : ''}">
                    ${displayVal}
                </div>
            </div>
        `;
    }

    cardsHtml += `</div>`;
    outputContainer.innerHTML = cardsHtml;
}


function escapeHtml(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")             
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
