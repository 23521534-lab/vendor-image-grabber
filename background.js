// background.js — Service Worker
// Handles extension lifecycle and download coordination

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("[VIG] Vendor Image Grabber installed");
  } else if (reason === "update") {
    console.log("[VIG] Updated to v2.0");
  }
});

// Optional: listen for download completion to track stats
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state?.current === "complete") {
    console.log(`[VIG] Download complete: ${delta.id}`);
  } else if (delta.error?.current) {
    console.warn(`[VIG] Download error: ${delta.error.current}`);
  }
});
