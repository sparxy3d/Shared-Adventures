import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, RotateCw, Trash2 } from "lucide-react";
import { AdminDialog } from "@/components/admin/dialog";
import { formatAdminDate } from "@/lib/admin";

type VendorDocument = {
  id: number;
  kind: string;
  mimeType: string;
  sizeBytes: number;
  status: "uploaded" | "deleted";
  deletedAt: string | null;
  deletedByName: string | null;
};

async function responseError(response: Response) {
  try {
    const body = await response.json() as { message?: string };
    return body.message || "The document action could not be completed.";
  } catch {
    return "The document action could not be completed.";
  }
}

function documentLabel(kind: string) {
  const labels: Record<string, string> = {
    idCopy: "ID copy",
    policeReport: "Police report",
    businessRegistration: "Business registration",
  };
  return labels[kind] ?? kind;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VendorDocuments({ vendorId }: { vendorId: number }) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<VendorDocument | null>(null);
  const [actionError, setActionError] = useState("");
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [retryView, setRetryView] = useState<VendorDocument | null>(null);
  const queryKey = ["/api/admin/vendors", vendorId, "documents"];
  const documents = useQuery<VendorDocument[]>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/admin/vendors/${vendorId}/documents`, { credentials: "include" });
      if (!response.ok) throw new Error(await responseError(response));
      return response.json();
    },
  });
  const removeDocument = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/admin/documents/${documentId}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error(await responseError(response));
    },
    onSuccess: async () => {
      setDeleting(null);
      setActionError("");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "The document could not be deleted."),
  });

  async function viewDocument(document: VendorDocument) {
    setActionError("");
    setRetryView(null);
    setViewingId(document.id);
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      setActionError("Allow pop-ups to view this document.");
      setViewingId(null);
      return;
    }
    tab.opener = null;
    try {
      const response = await fetch(`/api/admin/documents/${document.id}/content`, { credentials: "include" });
      if (!response.ok) throw new Error(await responseError(response));
      const objectUrl = URL.createObjectURL(await response.blob());
      tab.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      tab.close();
      setActionError(error instanceof Error ? error.message : "The document could not be opened.");
      setRetryView(document);
    } finally {
      setViewingId(null);
    }
  }

  return <section className="ad-vendor-documents" aria-labelledby={`vendor-documents-title-${vendorId}`}>
    <div className="ad-section-head">
      <div><p className="ad-eyebrow">Private verification records</p><h2 id={`vendor-documents-title-${vendorId}`}>Documents</h2></div>
      {!documents.isLoading && !documents.isError && <span className="ad-badge">{documents.data?.length ?? 0} records</span>}
    </div>
    {documents.isLoading ? <div className="ad-doc-skeleton" aria-label="Loading documents"><span /><span /><span /></div> :
      documents.isError ? <div className="ad-doc-state" role="alert">
        <p>{documents.error instanceof Error ? documents.error.message : "Documents could not be loaded."}</p>
        <button type="button" className="ad-button secondary" onClick={() => { void documents.refetch(); }}>Retry</button>
      </div> : documents.data?.length ? <div className="ad-doc-list">
        {documents.data.map((document) => <article className="ad-doc-row" key={document.id}>
          <span className="ad-doc-icon" aria-hidden="true"><FileText size={18} /></span>
          <div className="ad-doc-info">
            <strong>{documentLabel(document.kind)}</strong>
            <span>{document.mimeType} · {formatSize(document.sizeBytes)}</span>
            {document.status === "deleted" && <small>Deleted by {document.deletedByName || "Administrator"} on {formatAdminDate(document.deletedAt, true)}</small>}
          </div>
          <span className={`ad-badge ${document.status === "uploaded" ? "green" : "red"}`}>{document.status === "uploaded" ? "Uploaded" : "Deleted"}</span>
          {document.status === "uploaded" && <div className="ad-doc-actions">
            <button type="button" className="ad-button secondary" disabled={viewingId === document.id} onClick={() => { void viewDocument(document); }}>
              <Eye size={15} />{viewingId === document.id ? "Opening…" : "View document"}
            </button>
            <button type="button" className="ad-icon-button" aria-label={`Delete ${documentLabel(document.kind)}`} title="Delete document" onClick={() => { setActionError(""); setDeleting(document); }}>
              <Trash2 size={15} />
            </button>
          </div>}
        </article>)}
      </div> : <div className="ad-doc-state"><span>No verification documents have been submitted.</span><button type="button" className="ad-icon-button" aria-label="Refresh document list" onClick={() => { void documents.refetch(); }}><RotateCw size={15} /></button></div>}
    {actionError && <div className="ad-form-error" role="alert">{actionError}{retryView && <button type="button" className="ad-button secondary" onClick={() => { void viewDocument(retryView); }}>Retry</button>}</div>}
    {deleting && <div onKeyDownCapture={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!removeDocument.isPending) setDeleting(null);
      }
    }}>
      <AdminDialog title={`Delete ${documentLabel(deleting.kind)}?`} onClose={() => { if (!removeDocument.isPending) setDeleting(null); }}>
        <p style={{ color: "#70817a", fontSize: 13, lineHeight: 1.6 }}>This permanently removes access to the uploaded file. The deletion will be recorded in the document history.</p>
        {removeDocument.isError && <p className="ad-form-error" role="alert">{actionError || "The document could not be deleted."} <button type="button" className="ad-button secondary" onClick={() => { removeDocument.reset(); setActionError(""); }}>Retry</button></p>}
        <div className="ad-dialog-actions">
          <button type="button" className="ad-button secondary" disabled={removeDocument.isPending} onClick={() => setDeleting(null)}>Keep document</button>
          <button type="button" className="ad-button danger" disabled={removeDocument.isPending} onClick={() => removeDocument.mutate(deleting.id)}>{removeDocument.isPending ? "Deleting…" : "Delete document"}</button>
        </div>
      </AdminDialog>
    </div>}
  </section>;
}
