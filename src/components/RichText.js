import { richTextForPlain } from '@/lib/rich-text'

function MarkedText({ node }) {
  let content = node.text
  if (node.italic) content = <em>{content}</em>
  if (node.bold) content = <strong>{content}</strong>
  return content
}

export default function RichText({ value, fallback = '', maxLength = 20000 }) {
  const richDocument = richTextForPlain(value, fallback, maxLength)

  return (
    <span>
      {richDocument.content.map((node, nodeIndex) => {
        const lines = node.text.split('\n')
        return lines.map((line, lineIndex) => (
          <span key={`${nodeIndex}-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            <MarkedText node={{ ...node, text: line }} />
          </span>
        ))
      })}
    </span>
  )
}
