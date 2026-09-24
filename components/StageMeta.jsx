import { deriveApprovalStage } from '../lib/helpers';

// Compact single-line stand-in for the full ApprovalStepper, for dense
// table/list rows where a full stepper doesn't fit — shows just the stage +
// current owner (or, once decided, who decided) under the status badge.
export default function StageMeta({ request, profile, team }) {
  const { currentOwnerLabel, decisionBy } = deriveApprovalStage(request, { profile, team });

  if (decisionBy) {
    return (
      <div className="stage-meta stage-meta-decision">
        {decisionBy.role}{decisionBy.name ? ` (${decisionBy.name})` : ''}
      </div>
    );
  }
  if (currentOwnerLabel) {
    return <div className="stage-meta">{currentOwnerLabel}</div>;
  }
  return null;
}
