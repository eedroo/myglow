import { CompareCard, type ComparisonMap } from './CompareCard';

/** Página do exercício: a última sessão contra a anterior. */
export function CompareBlock({ comparison }: { comparison: ComparisonMap }) {
  return <CompareCard comparison={comparison} />;
}
