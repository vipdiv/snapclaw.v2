"use client";

import { useRef, useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import { parseExtractedText } from "./lib/parser";
import { parseWithGemini } from "./lib/gemini";

const CATEGORIES = ["EVENT_LOGISTICS","EXPENSE","IDEA","CONTENT","PROOF","BUG","REFERENCE","REVIEW_REQUIRED","OTHER"];

interface ExtractedData {
      title: string; date: string; startTime: string; endTime: string;
      timezone: string; location: string; category: string; extractedText: string;
}

interface StatusState {
      type: "success" | "error" | "info";
      message: string;
      link?: { href: string; label: string };
}

const EMPTY: ExtractedData = { title: "", date: "", startTime: "", endTime: "", timezone: "America/Chicago", location: "", category: CATEGORIES[0], extractedText: "" };

export default function Home() {
      const fileInputRef = useRef<HTMLInputElement>(null);
      const [screenshot, setScreenshot] = useState<string | null>(null);
      const [loading, setLoading] = useState(false);
      const [loadingCalendar, setLoadingCalendar] = useState(false);
      const [loadingSheet, setLoadingSheet] = useState(false);
      const [status, setStatus] = useState<StatusState | null>(null);
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const [extracted, setExtracted] = useState<ExtractedData>(EMPTY);

  useEffect(() => { checkAuthStatus(); }, []);

  const checkAuthStatus = async () => {
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get("auth") === "success") {
                    const response = await fetch("/api/auth/status", { cache: "no-store" as RequestCache });
                    if (response.ok) { setIsAuthenticated(true); window.history.replaceState({}, document.title, window.location.pathname); }
          } else {
                    try { const r = await fetch("/api/auth/status"); if (r.ok) setIsAuthenticated(true); } catch {}
          }
  };

  const connectGoogle = async () => {
          try {
                    const r = await fetch("/api/auth/google/start");
                    const d = await r.json();
                    if (d.url) window.location.href = d.url;
          } catch { setStatus({ type: "error", message: "Failed to initiate Google connection" }); }
  };

  const handleFileSelect = async (file: File) => {
          if (!file.type.startsWith("image/")) { setStatus({ type: "error", message: "Please select an image file" }); return; }
          setLoading(true);
          setStatus({ type: "info", message: "Reading image..." });
          try {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                                const imageData = e.target?.result as string;
                                setScreenshot(imageData);
                                setStatus({ type: "info", message: "Running OCR..." });
                                try {
                                              const result = await Tesseract.recognize(imageData, "eng");
                                              const text = result.data.text;
                                              const { data: parsed, confidence } = parseExtractedText(text);
                                              let final = { ...parsed };
                                              if (confidence < 50) {
                                                              setStatus({ type: "info", message: "Low confidence, using AI analysis..." });
                                                              const gemini = await parseWithGemini(text);
                                                              if (gemini) final = { ...parsed, ...gemini };
                                              }
                                              setExtracted({ title: (final.title as string)||"", date: (final.date as string)||"", startTime: (final.startTime as string)||"", endTime: (final.endTime as string)||"", timezone: (final.timezone as string)||"America/Chicago", location: (final.location as string)||"", category: CATEGORIES[0], extractedText: text });
                                              setStatus({ type: "success", message: "OCR completed" });
                                } catch { setStatus({ type: "error", message: "Failed to process image text" }); }
                    };
                    reader.readAsDataURL(file);
          } catch { setStatus({ type: "error", message: "Failed to read file" }); }
          finally { setLoading(false); }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files; if (f.length > 0) handleFileSelect(f[0]); };
      const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => { const { name, value } = e.target; setExtracted(prev => ({ ...prev, [name]: value })); };

  const createCalendarEvent = async () => {
          if (!isAuthenticated) { connectGoogle(); return; }
          if (!extracted.title) { setStatus({ type: "error", message: "Please enter a title" }); return; }
          setLoadingCalendar(true);
          setStatus({ type: "info", message: "Creating calendar event..." });
          try {
                    const r = await fetch("/api/calendar/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: extracted.title, date: extracted.date, startTime: extracted.startTime, endTime: extracted.endTime, timezone: extracted.timezone, location: extracted.location }) });
                    const d = await r.json();
                    if (r.ok) {
                                setStatus({ type: "success", message: "Event created!", link: d.htmlLink ? { href: d.htmlLink, label: "View in Calendar" } : undefined });
                    } else {
                                setStatus({ type: "error", message: `Calendar error: ${d.error || "Failed"}` });
                    }
          } catch (e) { setStatus({ type: "error", message: `Failed to create event: ${e instanceof Error ? e.message : "network error"}` }); }
          finally { setLoadingCalendar(false); }
  };

  const logToSheet = async () => {
          if (!isAuthenticated) { connectGoogle(); return; }
          if (!extracted.title) { setStatus({ type: "error", message: "Please enter a title" }); return; }
          setLoadingSheet(true);
          setStatus({ type: "info", message: "Logging to sheet..." });
          try {
                    const r = await fetch("/api/sheets/append", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: extracted.title, date: extracted.date, startTime: extracted.startTime, timezone: extracted.timezone, location: extracted.location, category: extracted.category, extractedText: extracted.extractedText }) });
                    const d = await r.json();
                    if (r.ok) {
                                setStatus({ type: "success", message: "Logged to sheet!", link: d.sheetUrl ? { href: d.sheetUrl, label: "Open Sheet" } : undefined });
                    } else {
                                setStatus({ type: "error", message: `Sheet error: ${d.error || "Failed"}` });
                    }
          } catch (e) { setStatus({ type: "error", message: `Failed to log: ${e instanceof Error ? e.message : "network error"}` }); }
          finally { setLoadingSheet(false); }
  };

  const startOver = () => { setScreenshot(null); setExtracted(EMPTY); setStatus(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  return (
          <div className="container">
                <header>
                        <div className="header-content">
                                  <svg className="mascot" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                              <circle cx="50" cy="40" r="20" fill="#FF6B6B" />
                                              <path d="M 30 40 L 20 50 L 25 45 Z" fill="#FF6B6B" />
                                              <path d="M 70 40 L 80 50 L 75 45 Z" fill="#FF6B6B" />
                                              <ellipse cx="45" cy="35" rx="3" ry="4" fill="#000" />
                                              <ellipse cx="55" cy="35" rx="3" ry="4" fill="#000" />
                                              <path d="M 50 45 L 50 55 M 45 55 L 55 55" stroke="#000" strokeWidth="2" />
                                              <rect x="35" y="60" width="30" height="30" rx="3" fill="#FFD700" />
                                              <circle cx="45" cy="75" r="6" fill="#FFA500" />
                                              <circle cx="55" cy="75" r="6" fill="#FFA500" />
                                  </svg>svg>
                                  <h1>SnapClaw</h1>h1>
                        </div>div>
                </header>header>
          
              {status && (
                      <div className={`status-message ${status.type}`}>
                          {status.message}
                          {status.link && (
                                      <> &mdash; <a href={status.link.href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}>{status.link.label}</a>a></>>
                                    )}
                      </div>div>
                )}
          
              {!screenshot ? (
                      <div className="upload-section">
                                <label htmlFor="file-input" className="upload-area" onDrop={handleDrop} onDragOver={handleDragOver}>
                                            <div className="upload-icon">📸</div>div>
                                            <div className="upload-text">Drop screenshot here or click</div>div>
                                            <span className="file-input-label">Choose Image</span>span>
                                </label>label>
                                <input ref={fileInputRef} type="file" id="file-input" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) handleFileSelect(f); }} />
                      </div>div>
                    ) : (
                      <div className="preview-section">
                                <img src={screenshot} alt="Preview" className="preview-image" />
                                <div className="extraction-form">
                                    {extracted.extractedText && <div className="intent-badge">Intent: {extracted.category}</div>div>}
                                            <div className="form-group"><label htmlFor="title">Title</label>label><input type="text" id="title" name="title" value={extracted.title} onChange={handleInputChange} placeholder="Event or item title" /></div>div>
                                            <div className="form-group"><label htmlFor="date">Date</label>label><input type="date" id="date" name="date" value={extracted.date} onChange={handleInputChange} /></div>div>
                                            <div className="form-group"><label htmlFor="startTime">Start Time</label>label><input type="time" id="startTime" name="startTime" value={extracted.startTime} onChange={handleInputChange} /></div>div>
                                            <div className="form-group"><label htmlFor="endTime">End Time</label>label><input type="time" id="endTime" name="endTime" value={extracted.endTime} onChange={handleInputChange} /></div>div>
                                            <div className="form-group"><label htmlFor="timezone">Timezone</label>label>
                                                          <select id="timezone" name="timezone" value={extracted.timezone} onChange={handleInputChange}>
                                                                          <option value="America/Chicago">Central Time (CT)</option>option>
                                                                          <option value="America/New_York">Eastern Time (ET)</option>option>
                                                                          <option value="America/Los_Angeles">Pacific Time (PT)</option>option>
                                                                          <option value="America/Denver">Mountain Time (MT)</option>option>
                                                          </select>select>
                                            </div>div>
                                            <div className="form-group"><label htmlFor="location">Location</label>label><input type="text" id="location" name="location" value={extracted.location} onChange={handleInputChange} placeholder="Location" /></div>div>
                                            <div className="form-group"><label htmlFor="category">Category</label>label>
                                                          <select id="category" name="category" value={extracted.category} onChange={handleInputChange}>
                                                              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>option>)}
                                                          </select>select>
                                            </div>div>
                                    {extracted.extractedText && (
                                        <div className="form-group"><label htmlFor="extractedText">Extracted Text</label>label>
                                                        <textarea id="extractedText" name="extractedText" value={extracted.extractedText} onChange={handleInputChange} rows={4} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px" }} />
                                        </div>div>
                                            )}
                                    {!isAuthenticated ? (
                                        <div className="button-group full"><button className="btn-primary connect-google-btn" onClick={connectGoogle}><span>🔗</span>span> Connect Google</button>button></div>div>
                                      ) : (
                                        <div className="button-group">
                                                        <button className="btn-primary" onClick={createCalendarEvent} disabled={loadingCalendar}>{loadingCalendar ? <span className="loading"></span>span> : ""}Calendar</button>button>
                                                        <button className="btn-primary" onClick={logToSheet} disabled={loadingSheet}>{loadingSheet ? <span className="loading"></span>span> : ""}Log Sheet</button>button>
                                        </div>div>
                                            )}
                                            <button className="btn-secondary" onClick={startOver} disabled={loadingCalendar || loadingSheet}>Start Over</button>button>
                                </div>div>
                      </div>div>
                )}
          </div>div>
        );
}</></div>
