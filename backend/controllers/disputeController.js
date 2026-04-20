import mongoose from 'mongoose';
import Election from '../models/Election.js';
import Candidate from '../models/Candidate.js';
import VoteReceipt from '../models/VoteReceipt.js';
import ElectionDispute, { DISPUTE_STATUSES, DISPUTE_TYPES } from '../models/ElectionDispute.js';

const STATUS_UPDATE_VALUES = ['under_review', 'resolved', 'rejected'];

const normalizeDispute = (dispute) => {
  const electionRef = dispute.election;
  const hasPopulatedElection = electionRef && typeof electionRef === 'object' && electionRef.name;

  const filedByRef = dispute.filedBy;
  const reviewedByRef = dispute.reviewedBy;

  return {
    _id: dispute.id,
    electionId: hasPopulatedElection ? electionRef.id : (dispute.election ? String(dispute.election) : null),
    electionName: dispute.electionName || (hasPopulatedElection ? electionRef.name : ''),
    type: dispute.type,
    subject: dispute.subject,
    description: dispute.description,
    receiptCode: dispute.receiptCode || '',
    candidate: dispute.candidate
      ? {
          _id: dispute.candidate.id,
          name: dispute.candidate.name,
          party: dispute.candidate.party
        }
      : null,
    filedBy: filedByRef
      ? {
          _id: filedByRef.id,
          name: filedByRef.name,
          email: filedByRef.email,
          role: filedByRef.role
        }
      : {
          _id: null,
          name: dispute.filedByName || 'Voter',
          email: '',
          role: 'Voter'
        },
    status: dispute.status,
    resolutionNote: dispute.resolutionNote || '',
    reviewedBy: reviewedByRef
      ? {
          _id: reviewedByRef.id,
          name: reviewedByRef.name,
          email: reviewedByRef.email,
          role: reviewedByRef.role
        }
      : null,
    reviewedAt: dispute.reviewedAt,
    closedAt: dispute.closedAt,
    statusTimeline: (dispute.statusTimeline || []).map((entry) => ({
      status: entry.status,
      note: entry.note || '',
      changedBy: entry.changedBy,
      changedAt: entry.changedAt
    })),
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt
  };
};

const buildSummary = (disputes) => {
  const summary = {
    totalCases: disputes.length,
    statusCounts: DISPUTE_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {}),
    typeCounts: DISPUTE_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {})
  };

  disputes.forEach((dispute) => {
    summary.statusCounts[dispute.status] = (summary.statusCounts[dispute.status] || 0) + 1;
    summary.typeCounts[dispute.type] = (summary.typeCounts[dispute.type] || 0) + 1;
  });

  return summary;
};

const resolveElection = async (electionId) => {
  if (!electionId || !mongoose.Types.ObjectId.isValid(electionId)) {
    return { error: { status: 400, message: 'A valid electionId is required.' } };
  }

  const election = await Election.findById(electionId).select('name status');

  if (!election) {
    return { error: { status: 404, message: 'Election not found.' } };
  }

  return { election };
};

const resolveOptionalCandidate = async (candidateId, electionId) => {
  if (!candidateId) {
    return { candidate: null };
  }

  if (!mongoose.Types.ObjectId.isValid(candidateId)) {
    return { error: { status: 400, message: 'Invalid candidateId.' } };
  }

  const candidate = await Candidate.findById(candidateId).select('name party election');

  if (!candidate) {
    return { error: { status: 404, message: 'Candidate not found.' } };
  }

  if (candidate.election && String(candidate.election) !== String(electionId)) {
    return { error: { status: 400, message: 'Candidate does not belong to the selected election.' } };
  }

  return { candidate };
};

const resolveOptionalReceipt = async ({ receiptCode, electionId, requesterId, requesterRole }) => {
  if (!receiptCode) {
    return { receipt: null, normalizedReceiptCode: '' };
  }

  const normalizedReceiptCode = String(receiptCode).trim().toUpperCase();

  const receipt = await VoteReceipt.findOne({
    receiptCode: normalizedReceiptCode,
    election: electionId
  }).select('receiptCode user election candidate');

  if (!receipt) {
    return {
      error: {
        status: 404,
        message: 'Receipt not found in the selected election.'
      }
    };
  }

  if (requesterRole !== 'Admin' && String(receipt.user) !== String(requesterId)) {
    return {
      error: {
        status: 403,
        message: 'You can only file disputes using your own receipt.'
      }
    };
  }

  return { receipt, normalizedReceiptCode };
};

const buildDisputeFilters = (query) => {
  const filter = {};

  const electionId = String(query.electionId || '').trim();
  if (electionId) {
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return { error: { status: 400, message: 'Invalid electionId filter.' } };
    }

    filter.election = electionId;
  }

  const status = String(query.status || '').trim().toLowerCase();
  if (status && status !== 'all') {
    if (!DISPUTE_STATUSES.includes(status)) {
      return { error: { status: 400, message: 'Invalid status filter.' } };
    }

    filter.status = status;
  }

  const type = String(query.type || '').trim().toLowerCase();
  if (type && type !== 'all') {
    if (!DISPUTE_TYPES.includes(type)) {
      return { error: { status: 400, message: 'Invalid type filter.' } };
    }

    filter.type = type;
  }

  return { filter };
};

// @desc Create a recount or dispute case
export const createDisputeCase = async (req, res) => {
  try {
    const electionId = String(req.body.electionId || '').trim();
    const type = String(req.body.type || '').trim().toLowerCase();
    const subject = String(req.body.subject || '').trim();
    const description = String(req.body.description || '').trim();
    const receiptCode = String(req.body.receiptCode || '').trim();
    const candidateId = String(req.body.candidateId || '').trim();

    if (!DISPUTE_TYPES.includes(type)) {
      return res.status(400).json({ message: 'type must be either dispute or recount.' });
    }

    if (subject.length < 8) {
      return res.status(400).json({ message: 'subject must be at least 8 characters.' });
    }

    if (description.length < 20) {
      return res.status(400).json({ message: 'description must be at least 20 characters.' });
    }

    const electionResult = await resolveElection(electionId);
    if (electionResult.error) {
      return res.status(electionResult.error.status).json({ message: electionResult.error.message });
    }

    const candidateResult = await resolveOptionalCandidate(candidateId, electionResult.election.id);
    if (candidateResult.error) {
      return res.status(candidateResult.error.status).json({ message: candidateResult.error.message });
    }

    const receiptResult = await resolveOptionalReceipt({
      receiptCode,
      electionId: electionResult.election.id,
      requesterId: req.user.id,
      requesterRole: req.user.role
    });

    if (receiptResult.error) {
      return res.status(receiptResult.error.status).json({ message: receiptResult.error.message });
    }

    if (type === 'recount' && !receiptResult.normalizedReceiptCode && !candidateResult.candidate) {
      return res.status(400).json({ message: 'Recount requests require a receiptCode or candidateId.' });
    }

    const dispute = await ElectionDispute.create({
      election: electionResult.election.id,
      electionName: electionResult.election.name,
      type,
      subject,
      description,
      receiptCode: receiptResult.normalizedReceiptCode || '',
      receipt: receiptResult.receipt ? receiptResult.receipt.id : null,
      candidate: candidateResult.candidate ? candidateResult.candidate.id : null,
      filedBy: req.user.id,
      filedByName: req.user.name || 'Voter',
      status: 'open',
      statusTimeline: [
        {
          status: 'open',
          note: 'Case created by voter.',
          changedBy: req.user.id,
          changedAt: new Date()
        }
      ]
    });

    const hydratedDispute = await ElectionDispute.findById(dispute.id)
      .populate('candidate', 'name party')
      .populate('filedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('election', 'name status');

    return res.status(201).json({
      message: 'Case filed successfully. Election administrators will review it shortly.',
      dispute: normalizeDispute(hydratedDispute)
    });
  } catch {
    return res.status(500).json({ message: 'Server error while creating dispute case.' });
  }
};

// @desc Get current user's disputes and recount requests
export const getMyDisputeCases = async (req, res) => {
  try {
    const filtersResult = buildDisputeFilters(req.query || {});

    if (filtersResult.error) {
      return res.status(filtersResult.error.status).json({ message: filtersResult.error.message });
    }

    const query = {
      ...filtersResult.filter,
      filedBy: req.user.id
    };

    const disputes = await ElectionDispute.find(query)
      .sort({ createdAt: -1 })
      .populate('candidate', 'name party')
      .populate('filedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('election', 'name status');

    const normalized = disputes.map((dispute) => normalizeDispute(dispute));

    return res.status(200).json({
      disputes: normalized,
      summary: buildSummary(normalized)
    });
  } catch {
    return res.status(500).json({ message: 'Server error while loading your dispute cases.' });
  }
};

// @desc Get admin dispute queue
export const getDisputeCasesForAdmin = async (req, res) => {
  try {
    const filtersResult = buildDisputeFilters(req.query || {});

    if (filtersResult.error) {
      return res.status(filtersResult.error.status).json({ message: filtersResult.error.message });
    }

    const query = { ...filtersResult.filter };

    const disputes = await ElectionDispute.find(query)
      .sort({ createdAt: -1 })
      .populate('candidate', 'name party')
      .populate('filedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('election', 'name status');

    const normalized = disputes.map((dispute) => normalizeDispute(dispute));

    return res.status(200).json({
      disputes: normalized,
      summary: buildSummary(normalized)
    });
  } catch {
    return res.status(500).json({ message: 'Server error while loading dispute queue.' });
  }
};

// @desc Update dispute case status (admin)
export const updateDisputeCaseStatus = async (req, res) => {
  try {
    const disputeId = String(req.params.disputeId || '').trim();
    const nextStatus = String(req.body.status || '').trim().toLowerCase();
    const resolutionNote = String(req.body.resolutionNote || '').trim();

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute id.' });
    }

    if (!STATUS_UPDATE_VALUES.includes(nextStatus)) {
      return res.status(400).json({ message: 'status must be one of under_review, resolved, rejected.' });
    }

    if ((nextStatus === 'resolved' || nextStatus === 'rejected') && resolutionNote.length < 10) {
      return res.status(400).json({ message: 'resolutionNote must be at least 10 characters for final status updates.' });
    }

    const dispute = await ElectionDispute.findById(disputeId);

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute case not found.' });
    }

    const now = new Date();

    dispute.status = nextStatus;
    dispute.reviewedBy = req.user.id;
    dispute.reviewedAt = now;

    if (resolutionNote) {
      dispute.resolutionNote = resolutionNote;
    }

    if (nextStatus === 'resolved' || nextStatus === 'rejected') {
      dispute.closedAt = now;
    } else {
      dispute.closedAt = null;
    }

    dispute.statusTimeline.push({
      status: nextStatus,
      note: resolutionNote || `Status updated to ${nextStatus}.`,
      changedBy: req.user.id,
      changedAt: now
    });

    await dispute.save();

    const hydratedDispute = await ElectionDispute.findById(dispute.id)
      .populate('candidate', 'name party')
      .populate('filedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('election', 'name status');

    return res.status(200).json({
      message: 'Dispute case updated successfully.',
      dispute: normalizeDispute(hydratedDispute)
    });
  } catch {
    return res.status(500).json({ message: 'Server error while updating dispute case.' });
  }
};

// @desc Get single dispute case detail
export const getDisputeCaseById = async (req, res) => {
  try {
    const disputeId = String(req.params.disputeId || '').trim();

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute id.' });
    }

    const dispute = await ElectionDispute.findById(disputeId)
      .populate('candidate', 'name party')
      .populate('filedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('election', 'name status');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute case not found.' });
    }

    if (req.user.role !== 'Admin' && String(dispute.filedBy?._id || dispute.filedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to view this dispute case.' });
    }

    return res.status(200).json({ dispute: normalizeDispute(dispute) });
  } catch {
    return res.status(500).json({ message: 'Server error while loading dispute case.' });
  }
};
