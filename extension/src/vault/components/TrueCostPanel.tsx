import type { TrueCostResponse } from '../../shared/types';

interface Props {
  trueCost?: TrueCostResponse;
  loading?: boolean;
  /** Render content only (no card chrome/heading): for use inside a collapsible section. */
  bare?: boolean;
}

function Stat({ value, label, colorClass }: { value: string; label: string; colorClass: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className={`text-4xl font-semibold ${colorClass}`}>{value}</span>
      <span className="text-sm text-gray-500 mt-1">{label}</span>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export default function TrueCostPanel({ trueCost, loading, bare }: Props) {
  if (!trueCost && !loading) return null;

  return (
    <div className={bare ? '' : 'glass rounded-card p-5'}>
      {!bare && <h3 className="uppercase tracking-wide text-sm text-gray-500 mb-4">True Cost</h3>}
      <div className="grid grid-cols-3 gap-4">
        {loading || !trueCost ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Stat value={`${trueCost.work_hours}h`} label="of your work" colorClass="text-forest" />
            <Stat
              value={`${trueCost.water_litres.toLocaleString()}L`}
              label="of water"
              colorClass="text-forest"
            />
            <Stat value={`${trueCost.kg_co2}kg`} label="of CO₂" colorClass="text-danger" />
          </>
        )}
      </div>
    </div>
  );
}
