import { useState, useEffect } from "react";
import { X, Search, Video, FileText, Image as ImageIcon, File, Upload, Loader2, Check } from "lucide-react";
import { getAccessToken } from "@/lib/auth";

interface UploadedFile {
  filename: string;
  url: string;
  type: "video" | "pdf" | "image" | "other";
  size: number;
  createdAt: string;
}

interface AssetSelectorProps {
  typeFilter: "video" | "pdf" | "image" | "all";
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function AssetSelector({ typeFilter, onSelect, onClose }: AssetSelectorProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/upload/files", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      setFiles(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    // Map filter type to backend route
    let uploadRoute = "/api/upload/video";
    if (typeFilter === "pdf" || file.type === "application/pdf") {
      uploadRoute = "/api/upload/pdf";
    } else if (typeFilter === "image" || file.type.startsWith("image/")) {
      uploadRoute = "/api/upload/thumbnail";
    }

    try {
      const token = getAccessToken();
      const res = await fetch(uploadRoute, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      onSelect(data.url);
      await fetchFiles();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || file.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5 text-orange-500" />;
      case "pdf":
        return <FileText className="h-5 w-5 text-blue-400" />;
      case "image":
        return <ImageIcon className="h-5 w-5 text-green-400" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getAcceptTypes = () => {
    switch (typeFilter) {
      case "video":
        return "video/mp4,video/webm,video/ogg";
      case "pdf":
        return "application/pdf";
      case "image":
        return "image/jpeg,image/png,image/webp,image/gif";
      default:
        return "*/*";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="rounded-xl border border-border bg-card p-6 w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div>
            <h3 className="text-lg font-mono font-bold text-foreground">
              Select {typeFilter === "all" ? "Asset" : typeFilter.toUpperCase()}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose an existing file or upload a new one.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <label className="flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/95 px-4 py-2 text-sm font-mono font-bold text-primary-foreground cursor-pointer transition-colors shrink-0 disabled:opacity-50">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload New
              </>
            )}
            <input
              type="file"
              accept={getAcceptTypes()}
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-mono mb-4">
            {error}
          </div>
        )}

        {/* Files Area */}
        <div className="flex-1 overflow-y-auto min-h-[250px] border border-border bg-background/50 rounded-lg p-2">
          {isLoading ? (
            <div className="flex h-full min-h-[250px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-muted-foreground">
              <File className="h-10 w-10 opacity-20 mb-2" />
              <p className="text-sm">No matching files found.</p>
              <p className="text-xs mt-1">Upload a file to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.filename}
                  className="flex items-center justify-between gap-3 border border-border rounded-lg p-3 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="shrink-0 rounded bg-white/5 p-2">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-foreground truncate" title={file.filename}>
                        {file.filename.split("-").slice(1).join("-") || file.filename}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {formatSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelect(file.url)}
                    className="shrink-0 flex items-center gap-1 rounded bg-primary/10 hover:bg-primary px-2.5 py-1 text-xs font-bold text-primary hover:text-primary-foreground transition-all"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
