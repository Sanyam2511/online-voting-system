import { useEffect, useState } from 'react';
import { BadgeCheck, LoaderCircle, SearchCheck, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import api from '../lib/api';
import receiptIllustration from '../assets/illustrations/receipt-verification.svg';
import { getAuthToken } from '../lib/auth';

const ReceiptCard = ({ title, receipt }) => (
  <article className="surface-card p-6">
    <p className="text-xs uppercase tracking-[0.1em] text-[#61759c] mb-2">{title}</p>
    <h3 className="text-lg text-[#12305c] mb-1">{receipt.electionName}</h3>
    <p className="text-sm text-[#4f6994] mb-4">Receipt Code: <span className="font-semibold text-[#1f66f4]">{receipt.receiptCode}</span></p>

    <div className="space-y-1 text-sm text-[#56719a]">
      <p><span className="font-semibold text-[#12305d]">Status:</span> {receipt.status}</p>
      <p><span className="font-semibold text-[#12305d]">Submitted At:</span> {new Date(receipt.submittedAt).toLocaleString()}</p>
      <p>
        <span className="font-semibold text-[#12305d]">Candidate:</span>{' '}
        {receipt.candidate ? `${receipt.candidate.name} (${receipt.candidate.party})` : 'Candidate not available'}
      </p>
    </div>
  </article>
);

const ReceiptVerification = () => {
  const [searchParams] = useSearchParams();
  const [lookupCode, setLookupCode] = useState(searchParams.get('code') || '');
  const [voterDetails, setVoterDetails] = useState(null);

  const [myReceipt, setMyReceipt] = useState(null);
  const [myLoading, setMyLoading] = useState(false);
  const [myError, setMyError] = useState('');

  const [verifiedReceipt, setVerifiedReceipt] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    const fetchMyReceipt = async () => {
      if (!getAuthToken()) {
        return;
      }

      setMyLoading(true);
      setMyError('');

      try {
        const [receiptResponse, voterResponse] = await Promise.all([
          api.get('/vote/receipt/me'),
          api.get('/auth/me')
        ]);

        setMyReceipt(receiptResponse.data);
        setVoterDetails(voterResponse.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          setMyError('Could not fetch your receipt right now.');
        }

        if (error.response?.status !== 401) {
          try {
            const voterResponse = await api.get('/auth/me');
            setVoterDetails(voterResponse.data);
          } catch {
            setVoterDetails(null);
          }
        }
      } finally {
        setMyLoading(false);
      }
    };

    fetchMyReceipt();
  }, []);

  useEffect(() => {
    const codeFromQuery = (searchParams.get('code') || '').trim().toUpperCase();

    if (!codeFromQuery) {
      return;
    }

    setLookupCode(codeFromQuery);
    verifyReceiptCode(codeFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyReceiptCode = async (codeOverride) => {
    const code = (codeOverride ?? lookupCode).trim().toUpperCase();

    if (!code) {
      setVerifyError('Please enter a valid receipt code.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError('');
    setVerifiedReceipt(null);

    try {
      const response = await api.get(`/vote/receipt/${encodeURIComponent(code)}`);
      setVerifiedReceipt(response.data);
      setLookupCode(code);
    } catch (error) {
      setVerifyError(error.response?.data?.message || 'Unable to verify receipt right now.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleExportPdf = () => {
    const receiptToExport = myReceipt || verifiedReceipt;

    if (!receiptToExport || !voterDetails) {
      return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const issueDate = new Date();
    const submittedAt = receiptToExport.submittedAt
      ? new Date(receiptToExport.submittedAt).toLocaleString()
      : 'Not available';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SecureVote Election Portal', 40, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Document Issued: ${issueDate.toLocaleString()}`, 40, 74);
    doc.text('Vote Integrity Export Report', 40, 92);

    doc.setDrawColor(198, 216, 246);
    doc.line(40, 108, 555, 108);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Voter Details', 40, 136);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Name: ${voterDetails.name || 'N/A'}`, 40, 160);
    doc.text(`Email: ${voterDetails.email || 'N/A'}`, 40, 180);
    doc.text(`Role: ${voterDetails.role || 'Voter'}`, 40, 200);
    doc.text(`Voting Status: ${voterDetails.hasVoted ? 'Vote Cast' : 'Not Cast Yet'}`, 40, 220);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Vote / Receipt Details', 40, 258);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Election: ${receiptToExport.electionName || 'N/A'}`, 40, 282);
    doc.text(`Receipt Code: ${receiptToExport.receiptCode || 'N/A'}`, 40, 302);
    doc.text(`Receipt Status: ${receiptToExport.status || 'N/A'}`, 40, 322);
    doc.text(`Submitted At: ${submittedAt}`, 40, 342);
    doc.text(
      `Candidate: ${receiptToExport.candidate ? `${receiptToExport.candidate.name} (${receiptToExport.candidate.party})` : 'Candidate not available'}`,
      40,
      362
    );

    doc.setDrawColor(198, 216, 246);
    doc.line(40, 390, 555, 390);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(
      'This report is generated from the vote integrity dashboard and is intended for record keeping.',
      40,
      412
    );

    const safeName = (voterDetails.name || 'voter').replace(/\s+/g, '-').toLowerCase();
    const safeCode = (receiptToExport.receiptCode || 'receipt').replace(/[^A-Za-z0-9-]/g, '');
    doc.save(`vote-integrity-${safeName}-${safeCode}.pdf`);
  };

  const canExport = Boolean(voterDetails && (myReceipt || verifiedReceipt));

  return (
    <main className="min-h-screen pt-28 pb-16">
      <div className="section-wrap">
        <header className="glass-panel p-8 md:p-10 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-center">
            <div>
              <p className="eyebrow mb-4">
                <ShieldCheck className="w-4 h-4" /> Vote Receipt Verification
              </p>
              <h1 className="text-4xl sm:text-5xl text-[#102347] mb-2">Verify Vote Integrity</h1>
              <p className="text-[#5e7398] leading-relaxed max-w-3xl">
                Confirm that a vote receipt exists in the election ledger by entering a receipt code generated at vote submission.
              </p>
            </div>
            <div className="rounded-2xl border border-[#c8d8f6] bg-white overflow-hidden">
              <img
                src={receiptIllustration}
                alt="Vote receipt verification dashboard"
                className="w-full h-44 object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </header>

        <section className="surface-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={lookupCode}
              onChange={(event) => setLookupCode(event.target.value.toUpperCase())}
              placeholder="Enter receipt code (e.g., CV-2026-AB12EF)"
              className="form-field"
            />
            <button
              type="button"
              onClick={() => verifyReceiptCode()}
              disabled={verifyLoading}
              className="btn-primary !py-3 px-6 inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {verifyLoading ? 'Verifying...' : 'Verify'}
              {!verifyLoading && <SearchCheck className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!canExport}
              className="btn-secondary !py-3 px-6 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Export PDF
            </button>
          </div>
          {verifyError && <p className="text-sm text-[#b63f3f] mt-3">{verifyError}</p>}
          {!canExport && (
            <p className="text-xs text-[#60759b] mt-3">
              Export becomes available when voter details and at least one receipt record are loaded.
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="glass-panel p-6">
            <h2 className="text-2xl text-[#102347] mb-4">My Receipt</h2>
            {myLoading ? (
              <div className="text-center py-8">
                <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
                <p className="text-sm text-[#60759b]">Loading your receipt...</p>
              </div>
            ) : myReceipt ? (
              <ReceiptCard title="Authenticated Voter Receipt" receipt={myReceipt} />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#bfd1f8] bg-[#f7fbff] p-5">
                <p className="text-sm text-[#60759b]">
                  {myError || 'Sign in and cast your vote to generate a personal receipt code.'}
                </p>
              </div>
            )}
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-2xl text-[#102347] mb-4">Verification Result</h2>
            {verifyLoading ? (
              <div className="text-center py-8">
                <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
                <p className="text-sm text-[#60759b]">Verifying receipt in ledger...</p>
              </div>
            ) : verifiedReceipt ? (
              <div>
                <div className="rounded-2xl border border-[#bfe0c8] bg-[#eefcf3] px-4 py-2 text-[#1f7d3f] text-sm inline-flex items-center gap-2 mb-4">
                  <BadgeCheck className="w-4 h-4" /> Receipt verified successfully
                </div>
                <ReceiptCard title="Ledger Verification" receipt={verifiedReceipt} />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#bfd1f8] bg-[#f7fbff] p-5">
                <p className="text-sm text-[#60759b]">Enter a receipt code to verify vote submission status.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default ReceiptVerification;
