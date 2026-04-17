import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const PartyCard = ({ partyName, candidates, selectedCandidateId, onSelectCandidate, disabled }) => {
  return (
    <section className="surface-card p-6 sm:p-7">
      <header className="mb-5 pb-4 border-b border-[#d6e1f4]">
        <p className="text-xs uppercase tracking-[0.12em] text-[#5d7298] mb-2">Political Party</p>
        <h3 className="text-2xl text-[#102347] mb-1">{partyName}</h3>
        <p className="text-sm text-[#5f7298]">{candidates.length} candidate{candidates.length > 1 ? 's' : ''} available</p>
      </header>

      <div className="space-y-3">
        {candidates.map((candidate) => {
          const isSelected = selectedCandidateId === candidate._id;

          return (
            <button
              key={candidate._id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectCandidate(candidate)}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-[#1f66f4] bg-[#edf3ff] shadow-[0_12px_22px_rgba(31,102,244,0.15)]'
                  : 'border-[#d5e0f4] bg-white hover:border-[#9eb8ec]'
              } ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start gap-3">
                <img
                  src={candidate.imageUrl}
                  alt={candidate.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[#c9d7f2]"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#12305d] truncate">{candidate.name}</p>
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-[#1f66f4] flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#8ca4d5] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#5f7298] mt-1 leading-relaxed">{candidate.manifesto}</p>
                  <p className="text-[11px] text-[#6c80a3] mt-2">Current votes: {candidate.voteCount}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default PartyCard;