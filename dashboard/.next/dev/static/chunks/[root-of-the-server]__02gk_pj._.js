(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime/runtime-types.d.ts" />
/// <reference path="../../../shared/runtime/dev-globals.d.ts" />
/// <reference path="../../../shared/runtime/dev-protocol.d.ts" />
/// <reference path="../../../shared/runtime/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateB.type === 'total') {
        // A total update replaces the entire chunk, so it supersedes any prior update.
        return updateB;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/nomba_hackathon/dashboard/components/sidebar.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/next/router.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
// Icon Components using raw SVG path definitions for crisp rendering
const HomeIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "w-5 h-5",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
            lineNumber: 20,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
        lineNumber: 19,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c = HomeIcon;
const UsersIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "w-5 h-5",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
            lineNumber: 30,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
        lineNumber: 29,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c1 = UsersIcon;
const ChartSquareIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "w-5 h-5",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
            lineNumber: 40,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
        lineNumber: 39,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c2 = ChartSquareIcon;
const AlertCircleIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "w-5 h-5",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
            lineNumber: 50,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
        lineNumber: 49,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c3 = AlertCircleIcon;
const RefreshCwIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "w-5 h-5",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m0 2l-3 3-3-3"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
            lineNumber: 60,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
        lineNumber: 59,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c4 = RefreshCwIcon;
const FileTextIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "w-5 h-5",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
            lineNumber: 70,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
        lineNumber: 69,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c5 = FileTextIcon;
function Sidebar({ variant, isOpen = false, onClose }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const currentPath = router.pathname;
    const ownerLinks = [
        {
            name: 'Dashboard',
            path: '/',
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(HomeIcon, {}, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 83,
                columnNumber: 43
            }, this)
        },
        {
            name: 'All Vendors',
            path: '/vendors',
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(UsersIcon, {}, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 84,
                columnNumber: 52
            }, this)
        },
        {
            name: 'Summary',
            path: '/summary',
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ChartSquareIcon, {}, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 85,
                columnNumber: 48
            }, this)
        },
        {
            name: 'Misdirected Payments',
            path: '/misdirected',
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AlertCircleIcon, {}, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 86,
                columnNumber: 65
            }, this)
        }
    ];
    const vendorLinks = [
        {
            name: 'Dashboard',
            path: '/vendor',
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(HomeIcon, {}, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 90,
                columnNumber: 49
            }, this)
        },
        {
            name: 'Transactions',
            path: '/transactions',
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RefreshCwIcon, {}, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 91,
                columnNumber: 58
            }, this)
        },
        {
            name: 'Statements',
            path: '/statements',
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FileTextIcon, {}, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 92,
                columnNumber: 54
            }, this)
        },
        {
            name: 'Customers',
            path: '/customers',
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(UsersIcon, {}, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 93,
                columnNumber: 52
            }, this)
        }
    ];
    const links = variant === 'owner' ? ownerLinks : vendorLinks;
    const checkIsActive = (path)=>{
        if (path === '/' || path === '/vendor') {
            return currentPath === path;
        }
        return currentPath.startsWith(path);
    };
    const renderContent = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col h-full bg-zinc-950 text-zinc-400 border-r border-zinc-800/80",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between px-6 py-5 border-b border-zinc-800/60",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-lg",
                                    children: "I"
                                }, void 0, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                    lineNumber: 110,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-semibold text-white tracking-wider text-sm block",
                                            children: "NOMBA ICE"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                            lineNumber: 114,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-[10px] text-zinc-500 uppercase tracking-widest font-medium",
                                            children: variant === 'owner' ? 'Platform Control' : 'Vendor Portal'
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                            lineNumber: 115,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                    lineNumber: 113,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                            lineNumber: 109,
                            columnNumber: 9
                        }, this),
                        onClose && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            className: "md:hidden flex items-center justify-center p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors",
                            onClick: onClose,
                            "aria-label": "Close navigation sidebar",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-5 h-5",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                viewBox: "0 0 24 24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    d: "M6 18L18 6M6 6l12 12"
                                }, void 0, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                    lineNumber: 134,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                lineNumber: 127,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                            lineNumber: 121,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                    lineNumber: 108,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                    className: "flex-1 px-4 py-6 space-y-1.5 overflow-y-auto",
                    children: links.map((link)=>{
                        const active = checkIsActive(link.path);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                            href: link.path,
                            className: `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${active ? 'bg-zinc-900 text-white border border-zinc-800' : 'hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent'}`,
                            onClick: onClose,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: active ? 'text-emerald-400' : 'text-zinc-500',
                                    children: link.icon
                                }, void 0, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                    lineNumber: 155,
                                    columnNumber: 15
                                }, this),
                                link.name
                            ]
                        }, link.path, true, {
                            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                            lineNumber: 145,
                            columnNumber: 13
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                    lineNumber: 141,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4 border-t border-zinc-800/60 bg-zinc-950/50",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3 px-2 py-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-white text-xs",
                                children: variant === 'owner' ? 'AD' : 'VE'
                            }, void 0, false, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                lineNumber: 165,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs font-semibold text-zinc-200 truncate",
                                        children: variant === 'owner' ? 'Admin Operator' : 'Vendor Merchant'
                                    }, void 0, false, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                        lineNumber: 169,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-zinc-500 truncate",
                                        children: variant === 'owner' ? 'ops@ice.nomba.com' : 'vendor@ice.nomba.com'
                                    }, void 0, false, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                        lineNumber: 172,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                                lineNumber: 168,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                        lineNumber: 164,
                        columnNumber: 9
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                    lineNumber: 163,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
            lineNumber: 106,
            columnNumber: 5
        }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: "hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30",
                children: renderContent()
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 184,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                        onClick: onClose
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                        lineNumber: 193,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        role: "dialog",
                        "aria-modal": "true",
                        "aria-label": `${variant === 'owner' ? 'Platform Control' : 'Vendor Portal'} Navigation`,
                        className: `absolute inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`,
                        children: renderContent()
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                        lineNumber: 198,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/nomba_hackathon/dashboard/components/sidebar.tsx",
                lineNumber: 189,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(Sidebar, "fN7XvhJ+p5oE6+Xlo0NJmXpxjC8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c6 = Sidebar;
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "HomeIcon");
__turbopack_context__.k.register(_c1, "UsersIcon");
__turbopack_context__.k.register(_c2, "ChartSquareIcon");
__turbopack_context__.k.register(_c3, "AlertCircleIcon");
__turbopack_context__.k.register(_c4, "RefreshCwIcon");
__turbopack_context__.k.register(_c5, "FileTextIcon");
__turbopack_context__.k.register(_c6, "Sidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/components/layout.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Layout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$sidebar$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/components/sidebar.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
function Layout({ variant, children }) {
    _s();
    const [isSidebarOpen, setIsSidebarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$sidebar$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                variant: variant,
                isOpen: isSidebarOpen,
                onClose: ()=>setIsSidebarOpen(false)
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-200",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/80 dark:border-zinc-800/60 dark:bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "md:hidden flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800",
                                        onClick: ()=>setIsSidebarOpen(true),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "sr-only",
                                                children: "Open sidebar"
                                            }, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                                lineNumber: 28,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-6 h-6",
                                                fill: "none",
                                                stroke: "currentColor",
                                                strokeWidth: "2",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M4 6h16M4 12h16M4 18h16"
                                                }, void 0, false, {
                                                    fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                                    lineNumber: 36,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                                lineNumber: 29,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                        lineNumber: 23,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded",
                                                children: "ICE"
                                            }, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                                lineNumber: 42,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-zinc-300 dark:text-zinc-700",
                                                children: "/"
                                            }, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                                lineNumber: 45,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                className: "text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200",
                                                children: variant === 'owner' ? 'Platform Management' : 'Vendor Terminal'
                                            }, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                                lineNumber: 46,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                        lineNumber: 41,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                lineNumber: 22,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "relative w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-600 dark:text-zinc-300 select-none",
                                        children: variant === 'owner' ? 'OP' : 'VD'
                                    }, void 0, false, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                        lineNumber: 56,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                    lineNumber: 55,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                                lineNumber: 53,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                        lineNumber: 20,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto",
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/nomba_hackathon/dashboard/components/layout.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_s(Layout, "7pDpjxpt81vLgIcSls7O8aGkvA4=");
_c = Layout;
var _c;
__turbopack_context__.k.register(_c, "Layout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/components/StatCard.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>StatCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function StatCard({ label, value, subtext, icon }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start justify-between gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/StatCard.tsx",
                        lineNumber: 14,
                        columnNumber: 9
                    }, this),
                    icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
                        children: icon
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/StatCard.tsx",
                        lineNumber: 18,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/nomba_hackathon/dashboard/components/StatCard.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: `text-2xl font-bold tracking-tight ${valueColor}`,
                        children: value
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/StatCard.tsx",
                        lineNumber: 24,
                        columnNumber: 9
                    }, this),
                    subtext && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-xs text-zinc-500 dark:text-zinc-400",
                        children: subtext
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/StatCard.tsx",
                        lineNumber: 26,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/nomba_hackathon/dashboard/components/StatCard.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/nomba_hackathon/dashboard/components/StatCard.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = StatCard;
var _c;
__turbopack_context__.k.register(_c, "StatCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/lib/format.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatKoboToNaira",
    ()=>formatKoboToNaira,
    "formatReconciliationRate",
    ()=>formatReconciliationRate,
    "formatTimestamp",
    ()=>formatTimestamp
]);
const nairaFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
});
const formatKoboToNaira = (kobo)=>nairaFormatter.format(kobo / 100);
const formatReconciliationRate = (rate)=>`${rate.toFixed(1)}%`;
const formatTimestamp = (value)=>{
    const date = new Date(value);
    const datePart = date.toLocaleDateString('en-NG', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const timePart = date.toLocaleTimeString('en-NG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    return `${datePart} · ${timePart}`;
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SummaryMetrics
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$StatCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/components/StatCard.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/format.ts [client] (ecmascript)");
;
;
;
const WalletIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "h-4 w-4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 5.25h16.5A1.5 1.5 0 0121.75 6.75v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
            lineNumber: 19,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
        lineNumber: 18,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c = WalletIcon;
const ChartIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "h-4 w-4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
            lineNumber: 29,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
        lineNumber: 28,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c1 = ChartIcon;
const UsersIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "h-4 w-4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0112.75 21.5h-1.5a2.25 2.25 0 01-2.25-2.263V19.13m-2.625.372a9.337 9.337 0 01-4.121-.952 4.125 4.125 0 007.533-2.493M3.75 19.128v-.003c0-1.113.285-2.16.786-3.07M4.5 19.128v.109A2.25 2.25 0 006.75 21.5h1.5a2.25 2.25 0 002.25-2.263V19.13"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
            lineNumber: 39,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
        lineNumber: 38,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c2 = UsersIcon;
const RefundIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "h-4 w-4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
            lineNumber: 49,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
        lineNumber: 48,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c3 = RefundIcon;
const AlertIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "h-4 w-4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
            lineNumber: 59,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
        lineNumber: 58,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c4 = AlertIcon;
function SummaryMetrics({ summary }) {
    const hasMisdirected = summary.misdirected_count > 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$StatCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Total Collected",
                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["formatKoboToNaira"])(summary.total_collected_kobo),
                subtext: "Across all vendors",
                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(WalletIcon, {}, void 0, false, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                    lineNumber: 76,
                    columnNumber: 15
                }, this)
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                lineNumber: 72,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$StatCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Reconciliation Rate",
                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["formatReconciliationRate"])(summary.reconciliation_rate),
                subtext: "Payments matched",
                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ChartIcon, {}, void 0, false, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                    lineNumber: 82,
                    columnNumber: 15
                }, this)
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                lineNumber: 78,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$StatCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Active Vendors",
                value: summary.active_vendors,
                subtext: "Collecting payments",
                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(UsersIcon, {}, void 0, false, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                    lineNumber: 88,
                    columnNumber: 15
                }, this)
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                lineNumber: 84,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$StatCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Total Refunds Issued",
                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["formatKoboToNaira"])(summary.total_refunds_kobo),
                subtext: "Returned to payers",
                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RefundIcon, {}, void 0, false, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                    lineNumber: 94,
                    columnNumber: 15
                }, this)
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                lineNumber: 90,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$StatCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Pending Misdirected",
                value: summary.misdirected_count,
                subtext: hasMisdirected ? 'Needs review' : 'All clear',
                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AlertIcon, {}, void 0, false, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                    lineNumber: 100,
                    columnNumber: 15
                }, this),
                tone: hasMisdirected ? 'danger' : 'default'
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx",
        lineNumber: 71,
        columnNumber: 5
    }, this);
}
_c5 = SummaryMetrics;
var _c, _c1, _c2, _c3, _c4, _c5;
__turbopack_context__.k.register(_c, "WalletIcon");
__turbopack_context__.k.register(_c1, "ChartIcon");
__turbopack_context__.k.register(_c2, "UsersIcon");
__turbopack_context__.k.register(_c3, "RefundIcon");
__turbopack_context__.k.register(_c4, "AlertIcon");
__turbopack_context__.k.register(_c5, "SummaryMetrics");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/lib/errors.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppError",
    ()=>AppError
]);
class AppError extends Error {
    code;
    constructor(code, message){
        super(message);
        this.name = 'AppError';
        this.code = code;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/lib/config.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/zod/v4/classic/external.js [client] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/errors.ts [client] (ecmascript)");
;
;
const envSchema = __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    NEXT_PUBLIC_API_URL: __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url().default('http://localhost:3000'),
    NODE_ENV: __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'development',
        'production',
        'test'
    ]).default('development')
});
const _env = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_API_URL,
    NODE_ENV: ("TURBOPACK compile-time value", "development")
});
if (!_env.success) {
    throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('CONFIG_ERROR', 'Invalid environment variables configuration');
}
const config = _env.data;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/lib/logger.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createLogger",
    ()=>createLogger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$pino$2f$browser$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/pino/browser.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$config$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/config.ts [client] (ecmascript)");
;
;
function createLogger(serviceName) {
    const isBrowser = ("TURBOPACK compile-time value", "object") !== 'undefined';
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$pino$2f$browser$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"])({
        name: serviceName,
        level: __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$config$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["config"].NODE_ENV === 'test' ? 'silent' : 'info',
        browser: ("TURBOPACK compile-time truthy", 1) ? {
            asObject: true
        } : "TURBOPACK unreachable",
        transport: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : undefined
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/lib/api.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "api",
    ()=>api
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/zod/v4/classic/external.js [client] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$config$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/config.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/errors.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$logger$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/logger.ts [client] (ecmascript)");
;
;
;
;
const log = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$logger$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["createLogger"])('api-client');
const BASE = __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$config$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["config"].NEXT_PUBLIC_API_URL.replace(/\/$/, '');
const apiResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    ok: __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    data: __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown().optional(),
    error: __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
const api = {
    get: async (path, options)=>{
        const headers = {
            Accept: 'application/json'
        };
        if (options?.key) {
            headers['Authorization'] = `Bearer ${options.key}`;
        }
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const response = await fetch(`${BASE}${cleanPath}`, {
            method: 'GET',
            headers
        });
        if (response.status === 401) {
            if ("TURBOPACK compile-time truthy", 1) {
                window.location.href = '/login';
            }
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('UNAUTHORIZED', 'Unauthorized');
        }
        if (!response.ok) {
            let errorMessage = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && typeof errorData === 'object') {
                    if ('message' in errorData && typeof errorData.message === 'string') {
                        errorMessage = errorData.message;
                    } else if ('error' in errorData && typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else if ('data' in errorData && errorData.data && typeof errorData.data === 'object' && 'message' in errorData.data && typeof errorData.data.message === 'string') {
                        errorMessage = errorData.data.message;
                    }
                }
            } catch (err) {
                // Intentionally swallowed: the error response body may not be valid JSON
                // (e.g. HTML error pages from a gateway). We log the failure and fall
                // through to throw a generic HTTP_ERROR with the status code instead.
                log.error({
                    err,
                    status: response.status
                }, 'Failed to parse GET error response JSON');
            }
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('HTTP_ERROR', errorMessage);
        }
        const result = await response.json();
        // Validate the response envelope
        const parsedEnvelope = apiResponseSchema.safeParse(result);
        if (parsedEnvelope.success) {
            if (!parsedEnvelope.data.ok) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('API_ERROR', parsedEnvelope.data.error || 'API returned ok=false');
            }
            const rawData = parsedEnvelope.data.data;
            if (options?.schema) {
                return options.schema.parse(rawData);
            }
            return rawData;
        }
        // Fallback if envelope does not match standard backend structure
        if (options?.schema) {
            return options.schema.parse(result);
        }
        return result;
    },
    post: async (path, body, options)=>{
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
        if (options?.key) {
            headers['Authorization'] = `Bearer ${options.key}`;
        }
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const response = await fetch(`${BASE}${cleanPath}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        if (response.status === 401) {
            if ("TURBOPACK compile-time truthy", 1) {
                window.location.href = '/login';
            }
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('UNAUTHORIZED', 'Unauthorized');
        }
        if (!response.ok) {
            let errorMessage = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && typeof errorData === 'object') {
                    if ('message' in errorData && typeof errorData.message === 'string') {
                        errorMessage = errorData.message;
                    } else if ('error' in errorData && typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else if ('data' in errorData && errorData.data && typeof errorData.data === 'object' && 'message' in errorData.data && typeof errorData.data.message === 'string') {
                        errorMessage = errorData.data.message;
                    }
                }
            } catch (err) {
                // Intentionally swallowed: the error response body may not be valid JSON
                // (e.g. HTML error pages from a gateway). We log the failure and fall
                // through to throw a generic HTTP_ERROR with the status code instead.
                log.error({
                    err,
                    status: response.status
                }, 'Failed to parse POST error response JSON');
            }
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('HTTP_ERROR', errorMessage);
        }
        const result = await response.json();
        // Validate the response envelope
        const parsedEnvelope = apiResponseSchema.safeParse(result);
        if (parsedEnvelope.success) {
            if (!parsedEnvelope.data.ok) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('API_ERROR', parsedEnvelope.data.error || 'API returned ok=false');
            }
            const rawData = parsedEnvelope.data.data;
            if (options?.schema) {
                return options.schema.parse(rawData);
            }
            return rawData;
        }
        // Fallback if envelope does not match standard backend structure
        if (options?.schema) {
            return options.schema.parse(result);
        }
        return result;
    },
    delete: async (path, options)=>{
        const headers = {
            Accept: 'application/json'
        };
        if (options?.key) {
            headers['Authorization'] = `Bearer ${options.key}`;
        }
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const response = await fetch(`${BASE}${cleanPath}`, {
            method: 'DELETE',
            headers
        });
        if (response.status === 401) {
            if ("TURBOPACK compile-time truthy", 1) {
                window.location.href = '/login';
            }
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('UNAUTHORIZED', 'Unauthorized');
        }
        if (!response.ok) {
            let errorMessage = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && typeof errorData === 'object') {
                    if ('message' in errorData && typeof errorData.message === 'string') {
                        errorMessage = errorData.message;
                    } else if ('error' in errorData && typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else if ('data' in errorData && errorData.data && typeof errorData.data === 'object' && 'message' in errorData.data && typeof errorData.data.message === 'string') {
                        errorMessage = errorData.data.message;
                    }
                }
            } catch (err) {
                log.error({
                    err,
                    status: response.status
                }, 'Failed to parse DELETE error response JSON');
            }
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('HTTP_ERROR', errorMessage);
        }
        const result = await response.json();
        const parsedEnvelope = apiResponseSchema.safeParse(result);
        if (parsedEnvelope.success) {
            if (!parsedEnvelope.data.ok) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$errors$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["AppError"]('API_ERROR', parsedEnvelope.data.error || 'API returned ok=false');
            }
            const rawData = parsedEnvelope.data.data;
            if (options?.schema) {
                return options.schema.parse(rawData);
            }
            return rawData;
        }
        if (options?.schema) {
            return options.schema.parse(result);
        }
        return result;
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MisdirectedPaymentCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/api.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$logger$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/logger.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/format.ts [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
const log = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$logger$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["createLogger"])('misdirected-payment-card');
const Spinner = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "h-3.5 w-3.5 animate-spin",
        fill: "none",
        viewBox: "0 0 24 24",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                className: "opacity-25",
                cx: "12",
                cy: "12",
                r: "10",
                stroke: "currentColor",
                strokeWidth: "4"
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                lineNumber: 24,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                className: "opacity-75",
                fill: "currentColor",
                d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                lineNumber: 25,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
        lineNumber: 23,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c = Spinner;
function MisdirectedPaymentCard({ payment, onResolved, onToast }) {
    _s();
    const [matchOpen, setMatchOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [refundOpen, setRefundOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [invoiceId, setInvoiceId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [matchLoading, setMatchLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [refundLoading, setRefundLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleMatch = async ()=>{
        const trimmed = invoiceId.trim();
        if (!trimmed) return;
        setMatchLoading(true);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["api"].post(`/v1/payments/${payment.id}/match`, {
                invoiceId: trimmed
            });
            onToast('success', `Payment matched to invoice ${trimmed}.`);
            onResolved(payment.id);
        } catch (err) {
            log.error({
                err,
                id: payment.id
            }, 'Failed to match misdirected payment');
            onToast('error', err instanceof Error ? err.message : 'Failed to match payment.');
        } finally{
            setMatchLoading(false);
        }
    };
    const handleRefund = async ()=>{
        setRefundLoading(true);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["api"].post(`/v1/payments/${payment.id}/refund`, {});
            onToast('success', `Refund of ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["formatKoboToNaira"])(payment.amount_kobo)} initiated.`);
            onResolved(payment.id);
        } catch (err) {
            log.error({
                err,
                id: payment.id
            }, 'Failed to refund misdirected payment');
            onToast('error', err instanceof Error ? err.message : 'Failed to refund payment.');
        } finally{
            setRefundLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
                                            children: "Sender"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 80,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mt-1 text-sm font-semibold text-zinc-900 dark:text-white",
                                            children: payment.sender_name
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 83,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                    lineNumber: 79,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
                                            children: "Amount"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 88,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mt-1 text-sm font-mono font-semibold text-zinc-900 dark:text-white",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["formatKoboToNaira"])(payment.amount_kobo)
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 91,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                    lineNumber: 87,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
                                            children: "VA Number"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 96,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mt-1 text-sm font-mono font-semibold text-zinc-900 dark:text-white",
                                            children: payment.va_number
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 99,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                    lineNumber: 95,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
                                            children: "Timestamp"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 104,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mt-1 text-xs text-zinc-500 dark:text-zinc-400",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["formatTimestamp"])(payment.created_at)
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 107,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                    lineNumber: 103,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                            lineNumber: 78,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex shrink-0 gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    disabled: matchLoading || refundLoading,
                                    onClick: ()=>setMatchOpen(true),
                                    className: "rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                                    children: matchLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Spinner, {}, void 0, false, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                        lineNumber: 120,
                                        columnNumber: 31
                                    }, this) : 'Match to Invoice'
                                }, void 0, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                    lineNumber: 114,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    disabled: matchLoading || refundLoading,
                                    onClick: ()=>setRefundOpen(true),
                                    className: "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400",
                                    children: refundLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Spinner, {}, void 0, false, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                        lineNumber: 128,
                                        columnNumber: 32
                                    }, this) : 'Initiate Refund'
                                }, void 0, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                    lineNumber: 122,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                            lineNumber: 113,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                    lineNumber: 77,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                lineNumber: 76,
                columnNumber: 7
            }, this),
            matchOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-black/60 backdrop-blur-sm",
                        onClick: ()=>setMatchOpen(false)
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                        lineNumber: 136,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        role: "dialog",
                        "aria-modal": "true",
                        "aria-labelledby": "match-title",
                        className: "relative max-w-md w-full rounded-2xl border border-zinc-850 bg-zinc-900 p-6 space-y-5 shadow-2xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                id: "match-title",
                                className: "text-base font-bold tracking-tight text-white",
                                children: "Match to Invoice"
                            }, void 0, false, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                lineNumber: 143,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-zinc-400",
                                children: "Enter the invoice ID this payment should be reconciled against."
                            }, void 0, false, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                lineNumber: 146,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                value: invoiceId,
                                onChange: (e)=>setInvoiceId(e.target.value),
                                placeholder: "e.g. inv_abc123",
                                disabled: matchLoading,
                                className: "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            }, void 0, false, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                lineNumber: 149,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        disabled: matchLoading,
                                        onClick: ()=>setMatchOpen(false),
                                        className: "flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-400 transition-all hover:text-white",
                                        children: "Cancel"
                                    }, void 0, false, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                        lineNumber: 158,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        disabled: matchLoading || !invoiceId.trim(),
                                        onClick: handleMatch,
                                        className: "flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40",
                                        children: [
                                            matchLoading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Spinner, {}, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                                lineNumber: 172,
                                                columnNumber: 34
                                            }, this),
                                            "Confirm Match"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                        lineNumber: 166,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                lineNumber: 157,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                        lineNumber: 137,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                lineNumber: 135,
                columnNumber: 9
            }, this),
            refundOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-black/60 backdrop-blur-sm",
                        onClick: ()=>setRefundOpen(false)
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                        lineNumber: 182,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        role: "dialog",
                        "aria-modal": "true",
                        "aria-labelledby": "refund-title",
                        className: "relative max-w-md w-full rounded-2xl border border-zinc-850 bg-zinc-900 p-6 space-y-5 shadow-2xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-3 text-red-400",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "h-5 w-5",
                                            fill: "none",
                                            stroke: "currentColor",
                                            strokeWidth: "2.5",
                                            viewBox: "0 0 24 24",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                            }, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                                lineNumber: 192,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                            lineNumber: 191,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                        lineNumber: 190,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                id: "refund-title",
                                                className: "text-base font-bold tracking-tight text-white",
                                                children: "Initiate Refund"
                                            }, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                                lineNumber: 200,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "mt-1 text-xs leading-relaxed text-zinc-400",
                                                children: [
                                                    "Are you sure you want to refund ",
                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$format$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["formatKoboToNaira"])(payment.amount_kobo),
                                                    " to",
                                                    ' ',
                                                    payment.sender_name,
                                                    "? This action returns the funds to the payer."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                                lineNumber: 203,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                        lineNumber: 199,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                lineNumber: 189,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        disabled: refundLoading,
                                        onClick: ()=>setRefundOpen(false),
                                        className: "flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-400 transition-all hover:text-white",
                                        children: "Cancel"
                                    }, void 0, false, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                        lineNumber: 210,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        disabled: refundLoading,
                                        onClick: handleRefund,
                                        className: "flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40",
                                        children: [
                                            refundLoading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Spinner, {}, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                                lineNumber: 224,
                                                columnNumber: 35
                                            }, this),
                                            "Confirm Refund"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                        lineNumber: 218,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                                lineNumber: 209,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                        lineNumber: 183,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx",
                lineNumber: 181,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true);
}
_s(MisdirectedPaymentCard, "aOxaY0Nm9ATF8jxaow98h7Z+Luo=");
_c1 = MisdirectedPaymentCard;
var _c, _c1;
__turbopack_context__.k.register(_c, "Spinner");
__turbopack_context__.k.register(_c1, "MisdirectedPaymentCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/lib/session.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// The ICE API is key-authenticated; the active vendor identity is resolved from
// the authenticated session. Until the session layer lands, the current vendor
// is supplied here as a single source of truth for the vendor dashboard so all
// data remains scoped to one vendor.
__turbopack_context__.s([
    "CURRENT_VENDOR_ID",
    ()=>CURRENT_VENDOR_ID
]);
const CURRENT_VENDOR_ID = '11111111-1111-1111-1111-111111111111';
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AnomalyAlertPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/api.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$logger$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/logger.ts [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
const log = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$logger$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["createLogger"])('anomaly-alert-panel');
const severityColor = {
    LOW: {
        color: 'text-zinc-600 bg-zinc-100 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700',
        dot: false
    },
    MEDIUM: {
        color: 'text-amber-700 bg-amber-50 border-amber-200/50 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20',
        dot: false
    },
    HIGH: {
        color: 'text-orange-700 bg-orange-50 border-orange-200/50 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20',
        dot: false
    },
    CRITICAL: {
        color: 'text-red-600 bg-red-50 border-red-200/50 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20',
        dot: true
    }
};
const PulsingDot = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "relative flex h-2.5 w-2.5",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                lineNumber: 42,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                lineNumber: 43,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
        lineNumber: 41,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c = PulsingDot;
const CheckCircle = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: "h-8 w-8 text-emerald-500",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M4.5 12.75l6 6 9-13.5"
        }, void 0, false, {
            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
            lineNumber: 49,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
        lineNumber: 48,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c1 = CheckCircle;
function AnomalyAlertPanel({ onToast }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [alerts, setAlerts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [errorMsg, setErrorMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [dismissingIds, setDismissingIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const fetchAlerts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AnomalyAlertPanel.useCallback[fetchAlerts]": async ()=>{
            setIsLoading(true);
            setErrorMsg(null);
            try {
                const data = await __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["api"].get('/v1/anomalies');
                setAlerts(data ?? []);
            } catch (err) {
                log.error({
                    err
                }, 'Failed to fetch anomaly alerts');
                setErrorMsg(err instanceof Error ? err.message : 'Failed to load anomaly alerts.');
            } finally{
                setIsLoading(false);
            }
        }
    }["AnomalyAlertPanel.useCallback[fetchAlerts]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AnomalyAlertPanel.useEffect": ()=>{
            const isMounted = {
                current: true
            };
            void ({
                "AnomalyAlertPanel.useEffect": async ()=>{
                    setIsLoading(true);
                    setErrorMsg(null);
                    try {
                        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["api"].get('/v1/anomalies');
                        if (isMounted.current) {
                            setAlerts(data ?? []);
                        }
                    } catch (err) {
                        if (isMounted.current) {
                            log.error({
                                err
                            }, 'Failed to fetch anomaly alerts');
                            setErrorMsg(err instanceof Error ? err.message : 'Failed to load anomaly alerts.');
                        }
                    } finally{
                        if (isMounted.current) {
                            setIsLoading(false);
                        }
                    }
                }
            })["AnomalyAlertPanel.useEffect"]();
            return ({
                "AnomalyAlertPanel.useEffect": ()=>{
                    isMounted.current = false;
                }
            })["AnomalyAlertPanel.useEffect"];
        }
    }["AnomalyAlertPanel.useEffect"], []);
    const handleInvestigate = (transactionId)=>{
        router.push(`/transactions/${transactionId}`);
    };
    const handleDismiss = async (alert)=>{
        setDismissingIds((prev)=>new Set(prev).add(alert.id));
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["api"].delete(`/v1/anomalies/${alert.id}`);
            onToast('success', `Alert dismissed: ${alert.rule}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to dismiss alert.';
            log.error({
                err,
                alertId: alert.id
            }, 'Failed to dismiss anomaly');
            onToast('error', message);
            setErrorMsg(message);
            setDismissingIds((prev)=>{
                const next = new Set(prev);
                next.delete(alert.id);
                return next;
            });
            return;
        }
        setTimeout(()=>{
            setAlerts((prev)=>prev.filter((a)=>a.id !== alert.id));
            setDismissingIds((prev)=>{
                const next = new Set(prev);
                next.delete(alert.id);
                return next;
            });
        }, 300);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300",
                children: "Anomaly Alerts"
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                lineNumber: 133,
                columnNumber: 7
            }, this),
            isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: [
                    ...Array(3)
                ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    }, i, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                        lineNumber: 140,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                lineNumber: 138,
                columnNumber: 9
            }, this) : errorMsg && alerts.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm font-semibold text-red-500",
                        children: errorMsg
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                        lineNumber: 148,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: fetchAlerts,
                        className: "mt-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750",
                        children: "Retry"
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                        lineNumber: 149,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                lineNumber: 147,
                columnNumber: 9
            }, this) : alerts.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto max-w-lg space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CheckCircle, {}, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                            lineNumber: 160,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                        lineNumber: 159,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                        className: "text-base font-bold text-zinc-900 dark:text-white",
                        children: "No anomalies detected — system operating normally"
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                        lineNumber: 162,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                lineNumber: 158,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: alerts.map((alert)=>{
                    const isDismissing = dismissingIds.has(alert.id);
                    const color = severityColor[alert.severity] ?? severityColor.LOW;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-opacity duration-300 ${isDismissing ? 'opacity-0' : 'opacity-100'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-1 flex-col gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                    className: "text-xs font-mono font-bold text-zinc-900 dark:text-white",
                                                    children: alert.rule
                                                }, void 0, false, {
                                                    fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                                    lineNumber: 181,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${color.color}`,
                                                    children: [
                                                        color.dot && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PulsingDot, {}, void 0, false, {
                                                            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                                            lineNumber: 187,
                                                            columnNumber: 39
                                                        }, this),
                                                        alert.severity
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                                    lineNumber: 184,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                            lineNumber: 180,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: `/transactions/${alert.transaction_id}`,
                                            className: "text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400",
                                            children: alert.transaction_id
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                            lineNumber: 191,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-zinc-500 dark:text-zinc-400",
                                            children: new Date(alert.timestamp).toLocaleString()
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                            lineNumber: 197,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                    lineNumber: 179,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex shrink-0 gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>handleInvestigate(alert.transaction_id),
                                            className: "rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                                            children: "Investigate"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                            lineNumber: 202,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>handleDismiss(alert),
                                            className: "rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                                            children: "Dismiss"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                            lineNumber: 209,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                                    lineNumber: 201,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                            lineNumber: 178,
                            columnNumber: 17
                        }, this)
                    }, alert.id, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                        lineNumber: 172,
                        columnNumber: 15
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
                lineNumber: 167,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx",
        lineNumber: 132,
        columnNumber: 5
    }, this);
}
_s(AnomalyAlertPanel, "siZxEiecspdA2SVLFqMZQHgiEgk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c2 = AnomalyAlertPanel;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "PulsingDot");
__turbopack_context__.k.register(_c1, "CheckCircle");
__turbopack_context__.k.register(_c2, "AnomalyAlertPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/nomba_hackathon/dashboard/pages/owner/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OwnerDashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$layout$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/components/layout.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$SummaryMetrics$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/components/SummaryMetrics.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$MisdirectedPaymentCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/components/MisdirectedPaymentCard.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/api.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$logger$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/logger.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$session$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/lib/session.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$AnomalyAlertPanel$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/nomba_hackathon/dashboard/components/AnomalyAlertPanel.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
;
const log = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$logger$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["createLogger"])('owner-dashboard-page');
function OwnerDashboard() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [summary, setSummary] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [payments, setPayments] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [errorMsg, setErrorMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const toastTimer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const showToast = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "OwnerDashboard.useCallback[showToast]": (kind, message)=>{
            if (toastTimer.current) {
                clearTimeout(toastTimer.current);
            }
            setToast({
                kind,
                message
            });
            toastTimer.current = setTimeout({
                "OwnerDashboard.useCallback[showToast]": ()=>setToast(null)
            }["OwnerDashboard.useCallback[showToast]"], 4000);
        }
    }["OwnerDashboard.useCallback[showToast]"], []);
    const handleResolved = (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "OwnerDashboard.useCallback[handleResolved]": (id)=>{
            setPayments({
                "OwnerDashboard.useCallback[handleResolved]": (prev)=>prev.filter({
                        "OwnerDashboard.useCallback[handleResolved]": (p)=>p.id !== id
                    }["OwnerDashboard.useCallback[handleResolved]"])
            }["OwnerDashboard.useCallback[handleResolved]"]);
            setSummary({
                "OwnerDashboard.useCallback[handleResolved]": (prev)=>prev ? {
                        ...prev,
                        misdirected_count: Math.max(0, prev.misdirected_count - 1)
                    } : prev
            }["OwnerDashboard.useCallback[handleResolved]"]);
        }
    }["OwnerDashboard.useCallback[handleResolved]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "OwnerDashboard.useEffect": ()=>{
            const isMounted = {
                current: true
            };
            void ({
                "OwnerDashboard.useEffect": async ()=>{
                    setIsLoading(true);
                    setErrorMsg(null);
                    try {
                        const [summaryRes, paymentsRes] = await Promise.all([
                            __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["api"].get(`/v1/merchants/${__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$session$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["CURRENT_MERCHANT_ID"]}/summary`),
                            __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$lib$2f$api$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["api"].get('/v1/payments/misdirected')
                        ]);
                        if (isMounted.current) {
                            if (summaryRes) setSummary(summaryRes);
                            if (paymentsRes) setPayments(paymentsRes.rows);
                        }
                    } catch (err) {
                        if (isMounted.current) {
                            log.error({
                                err
                            }, 'Failed to fetch owner dashboard data');
                            setErrorMsg(err instanceof Error ? err.message : 'An error occurred while loading the dashboard. Please try again.');
                        }
                    } finally{
                        if (isMounted.current) {
                            setIsLoading(false);
                        }
                    }
                }
            })["OwnerDashboard.useEffect"]();
            return ({
                "OwnerDashboard.useEffect": ()=>{
                    isMounted.current = false;
                }
            })["OwnerDashboard.useEffect"];
        }
    }["OwnerDashboard.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "OwnerDashboard.useEffect": ()=>{
            return ({
                "OwnerDashboard.useEffect": ()=>{
                    if (toastTimer.current) {
                        clearTimeout(toastTimer.current);
                    }
                }
            })["OwnerDashboard.useEffect"];
        }
    }["OwnerDashboard.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$layout$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
        variant: "owner",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col gap-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-2xl font-bold tracking-tight text-zinc-900 dark:text-white",
                            children: "Platform Dashboard"
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 93,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-zinc-500 dark:text-zinc-400",
                            children: "Collection health and misdirected payments across all vendors."
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 96,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                    lineNumber: 92,
                    columnNumber: 9
                }, this),
                toast && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    role: "status",
                    className: `flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${toast.kind === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'}`,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: toast.message
                    }, void 0, false, {
                        fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                        lineNumber: 110,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                    lineNumber: 102,
                    columnNumber: 11
                }, this),
                isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5",
                            children: [
                                ...Array(5)
                            ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                                }, i, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                    lineNumber: 118,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 116,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-3",
                            children: [
                                ...Array(3)
                            ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-24 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                                }, i, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                    lineNumber: 126,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 124,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                    lineNumber: 115,
                    columnNumber: 11
                }, this) : errorMsg ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mx-auto max-w-xl space-y-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm font-semibold text-red-500",
                            children: errorMsg
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 135,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: ()=>router.reload(),
                            className: "rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750",
                            children: "Retry Connection"
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 136,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                    lineNumber: 134,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        summary && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$SummaryMetrics$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                            summary: summary
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 146,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300",
                                            children: "Misdirected Payments Requiring Review"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                            lineNumber: 150,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/owner/misdirected",
                                            className: "text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400",
                                            children: "View all"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                            lineNumber: 153,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                    lineNumber: 149,
                                    columnNumber: 15
                                }, this),
                                payments.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mx-auto max-w-lg space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "h-6 w-6",
                                                fill: "none",
                                                stroke: "currentColor",
                                                strokeWidth: "2",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    d: "M4.5 12.75l6 6 9-13.5"
                                                }, void 0, false, {
                                                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                                    lineNumber: 165,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                                lineNumber: 164,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                            lineNumber: 163,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-base font-bold text-zinc-900 dark:text-white",
                                            children: "All payments reconciled"
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                            lineNumber: 168,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400",
                                            children: "There are no misdirected payments waiting for review right now."
                                        }, void 0, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                            lineNumber: 171,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                    lineNumber: 162,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-3",
                                    children: payments.map((payment)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$MisdirectedPaymentCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            payment: payment,
                                            onResolved: handleResolved,
                                            onToast: showToast
                                        }, payment.id, false, {
                                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                            lineNumber: 178,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                                    lineNumber: 176,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 148,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$components$2f$AnomalyAlertPanel$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                            onToast: showToast
                        }, void 0, false, {
                            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
                            lineNumber: 188,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true)
            ]
        }, void 0, true, {
            fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
            lineNumber: 91,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/nomba_hackathon/dashboard/pages/owner/index.tsx",
        lineNumber: 90,
        columnNumber: 5
    }, this);
}
_s(OwnerDashboard, "i0BPgyi4JZsrYzdAxldOQV87eQs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$nomba_hackathon$2f$dashboard$2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = OwnerDashboard;
var _c;
__turbopack_context__.k.register(_c, "OwnerDashboard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/nomba_hackathon/dashboard/pages/owner/index.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/owner";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/nomba_hackathon/dashboard/pages/owner/index.tsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if ("TURBOPACK compile-time truthy", 1) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/nomba_hackathon/dashboard/pages/owner/index.tsx\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/nomba_hackathon/dashboard/pages/owner/index.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__02gk_pj._.js.map