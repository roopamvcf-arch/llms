import { AdminSidebar } from "@/components/AdminSidebar";
import { FileText, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AdminCertificatesPage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Certificates</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage certificate templates and issued certificates</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Certificate Template</h2>
            <div className="bg-white rounded-xl p-8 shadow-inner">
              <div className="bg-[#f97316] rounded-t-lg px-6 py-4 -mx-4 -mt-4 mb-6">
                <p className="text-white text-xs font-mono font-bold uppercase tracking-widest">CyberLearn LMS</p>
                <h2 className="text-2xl font-bold text-white mt-1">Certificate of Completion</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-sm">This is to certify that</p>
                  <p className="text-2xl font-bold text-gray-900 font-mono">[Student Name]</p>
                </div>
                <p className="text-gray-500 text-sm">has successfully completed</p>
                <p className="text-xl font-semibold text-gray-800">[Course Name]</p>
                <div className="flex items-center gap-2 border border-green-200 bg-green-50 rounded-lg px-3 py-2 w-fit">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-mono font-bold text-green-700 uppercase">Blockchain Verified</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-4">About Certificates</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Certificates are automatically generated when students complete 100% of a course's lessons.</p>
              <p>Each certificate has a unique verification hash that can be verified at <span className="text-primary font-mono">/verify/[hash]</span>.</p>
              <p>Students can generate their certificates from the Certificates page in their portal.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
