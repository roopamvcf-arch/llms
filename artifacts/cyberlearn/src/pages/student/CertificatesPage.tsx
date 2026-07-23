import { useState } from "react";
import { FileText, CheckCircle, X, Download } from "lucide-react";
import { StudentSidebar } from "@/components/StudentSidebar";
import { useGetMyCertificates, getGetMyCertificatesQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";

function CertificateModal({ cert, onClose }: { cert: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <X className="h-5 w-5" />
        </button>
        <div className="bg-[#f97316] px-8 py-6">
          <p className="text-white text-xs font-mono font-bold uppercase tracking-widest mb-1">Vande E-Kit LMS</p>
          <h2 className="text-2xl font-bold text-white">Certificate of Completion</h2>
        </div>
        <div className="px-8 py-8">
          <p className="text-gray-500 text-sm mb-2">This is to certify that</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{cert.studentName || "Student"}</p>
          <p className="text-gray-500 text-sm mb-1">has successfully completed</p>
          <p className="text-xl font-semibold text-gray-800 mb-6">{cert.courseName}</p>
          <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl px-4 py-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs font-mono font-bold text-green-700 uppercase">VERIFIED</p>
              <p className="text-xs text-green-600 font-mono">{cert.certHash}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>Issued: {formatDate(cert.issuedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentCertificatesPage() {
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  const { data: certificates, isLoading } = useGetMyCertificates({ query: { queryKey: getGetMyCertificatesQueryKey() } });

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Certificates</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Proof of your cybersecurity expertise</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />)}
            </div>
          ) : (certificates?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No certificates yet. Complete a course to earn one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {certificates?.map(cert => (
                <div key={cert.id} data-testid={`cert-${cert.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{cert.courseName}</p>
                    <p className="text-xs text-muted-foreground">Issued {formatDate(cert.issuedAt)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3 text-green-400" />
                      <span className="text-xs text-green-400 font-mono">{cert.certHash.slice(0, 16)}...</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCert(cert)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedCert && <CertificateModal cert={selectedCert} onClose={() => setSelectedCert(null)} />}
    </div>
  );
}
