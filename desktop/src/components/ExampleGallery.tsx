import type { TeachingCase } from "../core/types";

interface Props {
  cases: TeachingCase[];
  onLoad: (teachingCase: TeachingCase) => void;
}

export default function ExampleGallery({ cases, onLoad }: Props) {
  return (
    <section className="panel examples-panel">
      <div className="panel-heading">
        <h2>内置案例</h2>
        <span>保存文件将沿用同一格式</span>
      </div>
      <div className="example-list">
        {cases.map((teachingCase) => (
          <article className="example-card" key={teachingCase.id}>
            <h3>{teachingCase.title}</h3>
            <p>{teachingCase.description}</p>
            <button onClick={() => onLoad(teachingCase)}>加载</button>
          </article>
        ))}
      </div>
    </section>
  );
}
