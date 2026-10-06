import policies from '@/lib/legal-policies.json'
import styles from './legal-policy.module.css'

function PolicyText({ runs }) {
  return runs.map((run, index) => {
    let content = run.text
    if (run.italic) content = <em>{content}</em>
    if (run.bold) content = <strong>{content}</strong>
    return <span key={index}>{content}</span>
  })
}

export default function LegalPolicy({ policy }) {
  const { title, blocks } = policies[policy]
  const content = []

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block.type === 'listItem') {
      const items = []
      do {
        items.push(<li key={index}><PolicyText runs={blocks[index].runs} /></li>)
        index += 1
      } while (index < blocks.length && blocks[index].type === 'listItem')
      index -= 1
      content.push(<ul key={`list-${index}`}>{items}</ul>)
    } else if (block.type === 'table') {
      content.push(
        <div className={styles.tableContainer} key={index}>
          <table>
            <thead><tr>{block.headers.map((runs, cell) => <th scope="col" key={cell}><PolicyText runs={runs} /></th>)}</tr></thead>
            <tbody>{block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((runs, cell) => (
                <td key={cell} data-label={block.headers[cell].map(run => run.text).join('')}><PolicyText runs={runs} /></td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
      )
    } else {
      const Tag = block.type === 'heading' ? 'h2' : block.type === 'subheading' ? 'h3' : 'p'
      content.push(<Tag key={index}><PolicyText runs={block.runs} /></Tag>)
    }
  }

  return (
    <main className={styles.page}>
      <article className={styles.document} aria-labelledby="policy-title">
        <header className={styles.header}><h1 id="policy-title">{title}</h1></header>
        <div className={styles.content}>{content}</div>
      </article>
    </main>
  )
}
