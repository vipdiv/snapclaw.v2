"use client";

import { useRef, useState, useEffect } from "react";
import Tesseract from "tesseract.js";

const CATEGORIES = [
  "EVENT_LOGISTICS",
  "EXPENSE",
  "IDEA",
  "CONTENT",
  "PROOF",
  "BUG",
  "REFERENCE",
  "REVIEW_REQUIRED",
  "OTHER",
];

interface ExtractedData {
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  extractedText: string;
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData>({
    title: "",
    date: "",
    time: "",
    location: "",
    category: CATEGORIES[0],
    extractedText: "",
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
        // Check if returning from OAuth callback
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("auth") === "success") {
                // Call status endpoint with no-store cache
                const response = await fetch("/api/auth/status", { 
                          cache: "no-store" as RequestCache 
                });
                if (response.ok) {
                          setIsAuthenticated(true);
                          // Clean up URL by removing auth param
                          window.history.replaceState({}, document.title, window.location.pathname);
                }
        } else {
                // Normal auth check
                try {
                          const response = await fetch("/api/auth/status");
                          if (response.ok) {
                                      setIsAuthenticated(true);
                          }
                } catch (err) {
                          console.log("Not authenticated");
                }
        }
  };

  const connectGoogle = async () => {
    try {
      const response = await fetch("/api/auth/google/start");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: "Failed to initiate Google connection",
      });
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Please select an image file" });
      return;
    }

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

          setExtracted({
            title: "",
            date: "",
            time: "",
            location: "",
            category: CATEGORIES[0],
            extractedText: text,
          });

          setStatus({ type: "success", message: "OCR completed" });
        } catch (ocrErr) {
          console.error("OCR error:", ocrErr);
          setStatus({
            type: "error",
            message: "Failed to process image text",
          });
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error:", err);
      setStatus({ type: "error", message: "Failed to read file" });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setExtracted((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const createCalendarEvent = async () => {
    if (!isAuthenticated) {
      connectGoogle();
      return;
    }

    if (!extracted.title) {
      setStatus({ type: "error", message: "Please enter a title" });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Creating calendar event..." });

    try {
      const response = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: extracted.title,
          date: extracted.date,
          time: extracted.time,
          location: extracted.location,
        }),
      });

      if (response.ok) {
        setStatus({
          type: "success",
          message: "Event created successfully",
        });
      } else {
        setStatus({
          type: "error",
          message: "Failed to create event",
        });
      }
    } catch (err) {
      console.error("Error:", err);
      setStatus({ type: "error", message: "Failed to create event" });
    } finally {
      setLoading(false);
    }
  };

  const logToSheet = async () => {
    if (!isAuthenticated) {
      connectGoogle();
      return;
    }

    if (!extracted.title) {
      setStatus({ type: "error", message: "Please enter a title" });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Logging to sheet..." });

    try {
      const response = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: extracted.title,
          date: extracted.date,
          time: extracted.time,
          location: extracted.location,
          category: extracted.category,
          extractedText: extracted.extractedText,
        }),
      });

      if (response.ok) {
        setStatus({
          type: "success",
          message: "Logged to sheet successfully",
        });
      } else {
        setStatus({
          type: "error",
          message: "Failed to log to sheet",
        });
      }
    } catch (err) {
      console.error("Error:", err);
      setStatus({ type: "error", message: "Failed to log to sheet" });
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setScreenshot(null);
    setExtracted({
      title: "",
      date: "",
      time: "",
      location: "",
      category: CATEGORIES[0],
      extractedText: "",
    });
    setStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container">
      <header>
        <div className="header-content">
          <svg
            className="mascot"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="40" r="20" fill="#FF6B6B" />
            <path d="M 30 40 L 20 50 L 25 45 Z" fill="#FF6B6B" />
            <path d="M 70 40 L 80 50 L 75 45 Z" fill="#FF6B6B" />
            <ellipse cx="45" cy="35" rx="3" ry="4" fill="#000" />
            <ellipse cx="55" cy="35" rx="3" ry="4" fill="#000" />
            <path d="M 50 45 L 50 55 M 45 55 L 55 55" stroke="#000" strokeWidth="2" />
            <rect x="35" y="60" width="30" height="30" rx="3" fill="#FFD700" />
            <circle cx="45" cy="75" r="6" fill="#FFA500" />
            <circle cx="55" cy="75" r="6" fill="#FFA500" />
          </svg>
          <h1>SnapClaw</h1>
        </div>
      </header>

      {status && (
        <div className={`status-message ${status.type}`}>{status.message}</div>
      )}

      {!screenshot ? (
        <div className="upload-section">
          <label htmlFor="file-input"
            className="upload-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="upload-icon">📸</div>
            <div className="upload-text">Drop screenshot here or click</div>
            <span className="file-input-label">Choose Image</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            accept="image/*"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              e.currentTarget.value = "";
              if (selectedFile) {
                handleFileSelect(selectedFile);
              }
            }}
          />
        </div>
      ) : (
        <div className="preview-section">
          <img src={screenshot} alt="Preview" className="preview-image" />

          <div className="extraction-form">
            {extracted.extractedText && (
              <div className="intent-badge">
                Intent: {extracted.category}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={extracted.title}
                onChange={handleInputChange}
                placeholder="Event or item title"
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={extracted.date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time</label>
              <input
                type="time"
                id="time"
                name="time"
                value={extracted.time}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={extracted.location}
                onChange={handleInputChange}
                placeholder="Location"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={extracted.category}
                onChange={handleInputChange}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {extracted.extractedText && (
              <div className="form-group">
                <label htmlFor="extractedText">Extracted Text</label>
                <textarea
                  id="extractedText"
                  name="extractedText"
                  value={extracted.extractedText}
                  onChange={(e) =>
                    setExtracted((prev) => ({
                      ...prev,
                      extractedText: e.target.value,
                    }))
                  }
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                />
              </div>
            )}

            {!isAuthenticated ? (
              <div className="button-group full">
                <button className="btn-primary connect-google-btn" onClick={connectGoogle}>
                  <span>🔗</span> Connect Google
                </button>
              </div>
            ) : (
              <div className="button-group">
                <button
                  className="btn-primary"
                  onClick={createCalendarEvent}
                  disabled={loading}
                >
                  {loading ? <span className="loading"></span> : ""}
                  Calendar
                </button>
                <button
                  className="btn-primary"
                  onClick={logToSheet}
                  disabled={loading}
                >
                  {loading ? <span className="loading"></span> : ""}
                  Log Sheet
                </button>
              </div>
            )}

            <button className="btn-secondary" onClick={startOver} disabled={loading}>
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
