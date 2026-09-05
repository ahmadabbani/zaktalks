'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createRichText, normalizeRichText, richTextToPlainText } from '@/lib/rich-text'
import styles from './RichTextEditor.module.css'

function marksFromElement(element, inherited) {
  if (!(element instanceof HTMLElement)) return inherited
  const tag = element.tagName.toLowerCase()
  const weight = element.style.fontWeight.toLowerCase()
  const style = element.style.fontStyle.toLowerCase()
  return {
    bold: inherited.bold || tag === 'b' || tag === 'strong' || weight === 'bold' || /^[6-9]00$/.test(weight),
    italic: inherited.italic || tag === 'i' || tag === 'em' || style === 'italic' || style === 'oblique',
  }
}

function append(nodes, text, marks) {
  if (!text) return
  const previous = nodes[nodes.length - 1]
  if (previous && Boolean(previous.bold) === Boolean(marks.bold) && Boolean(previous.italic) === Boolean(marks.italic)) {
    previous.text += text
    return
  }
  const node = { text }
  if (marks.bold) node.bold = true
  if (marks.italic) node.italic = true
  nodes.push(node)
}

function documentFromDom(root, maxLength, singleLine) {
  const nodes = []
  const blockTags = new Set(['div', 'p', 'li'])

  const walk = (node, marks = { bold: false, italic: false }) => {
    if (node.nodeType === Node.TEXT_NODE) {
      append(nodes, node.nodeValue || '', marks)
      return
    }
    if (!(node instanceof HTMLElement)) return

    const tag = node.tagName.toLowerCase()
    if (tag === 'br') {
      append(nodes, '\n', marks)
      return
    }

    const nextMarks = marksFromElement(node, marks)
    Array.from(node.childNodes).forEach((child) => walk(child, nextMarks))
    if (blockTags.has(tag) && node.nextSibling) append(nodes, '\n', nextMarks)
  }

  Array.from(root.childNodes).forEach((child) => walk(child))
  let result = normalizeRichText({ version: 1, content: nodes }, '', maxLength)

  if (singleLine) {
    result = normalizeRichText({
      version: 1,
      content: result.content.map((node) => ({ ...node, text: node.text.replace(/\s*\n\s*/g, ' ') })),
    }, '', maxLength)
  }

  return result
}

function appendRichNode(fragment, node) {
  const parts = node.text.split('\n')
  parts.forEach((part, index) => {
    if (index > 0) fragment.append(document.createElement('br'))
    if (!part) return
    let content = document.createTextNode(part)
    if (node.italic) {
      const italic = document.createElement('em')
      italic.append(content)
      content = italic
    }
    if (node.bold) {
      const bold = document.createElement('strong')
      bold.append(content)
      content = bold
    }
    fragment.append(content)
  })
}

function writeDocument(root, value) {
  const fragment = document.createDocumentFragment()
  value.content.forEach((node) => appendRichNode(fragment, node))
  root.replaceChildren(fragment)
}

function documentFromPastedData(clipboardData, maxLength, singleLine) {
  const html = clipboardData.getData('text/html')
  const plain = clipboardData.getData('text/plain')
  if (!html) return createRichText(singleLine ? plain.replace(/\s*\n\s*/g, ' ') : plain, maxLength)

  const parsed = new DOMParser().parseFromString(html, 'text/html')
  return documentFromDom(parsed.body, maxLength, singleLine)
}

function insertDocumentAtSelection(root, value) {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !root.contains(selection.anchorNode)) return

  const range = selection.getRangeAt(0)
  range.deleteContents()
  const fragment = document.createDocumentFragment()
  value.content.forEach((node) => appendRichNode(fragment, node))
  const lastNode = fragment.lastChild
  range.insertNode(fragment)

  if (lastNode) {
    range.setStartAfter(lastNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

export default function RichTextEditor({
  id,
  name,
  value,
  onChange,
  placeholder = 'Write here...',
  ariaLabel,
  maxLength = 20000,
  singleLine = false,
  className = '',
}) {
  const editorRef = useRef(null)
  const lastDomSignature = useRef('')
  const [activeMarks, setActiveMarks] = useState({ bold: false, italic: false })
  const normalizedValue = normalizeRichText(value, '', maxLength)
  const valueSignature = JSON.stringify(normalizedValue)
  const plainValue = richTextToPlainText(normalizedValue, maxLength)

  useLayoutEffect(() => {
    if (!editorRef.current || lastDomSignature.current === valueSignature) return
    writeDocument(editorRef.current, normalizedValue)
    lastDomSignature.current = valueSignature
  }, [normalizedValue, valueSignature])

  const updateActiveMarks = () => {
    const selection = window.getSelection()
    if (!selection?.anchorNode || !editorRef.current?.contains(selection.anchorNode)) return
    setActiveMarks({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
    })
  }

  const emitChange = () => {
    if (!editorRef.current) return
    const nextValue = documentFromDom(editorRef.current, maxLength, singleLine)
    const nextSignature = JSON.stringify(nextValue)
    if (nextSignature !== JSON.stringify(documentFromDom(editorRef.current, Number.MAX_SAFE_INTEGER, singleLine))) {
      writeDocument(editorRef.current, nextValue)
    }
    lastDomSignature.current = nextSignature
    onChange(nextValue)
    updateActiveMarks()
  }

  const applyFormat = (command) => {
    editorRef.current?.focus()
    document.execCommand(command, false)
    emitChange()
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const pasted = documentFromPastedData(event.clipboardData, maxLength, singleLine)
    insertDocumentAtSelection(editorRef.current, pasted)
    emitChange()
  }

  const handleDrop = (event) => {
    event.preventDefault()
    editorRef.current?.focus()
    const plain = event.dataTransfer.getData('text/plain')
    insertDocumentAtSelection(editorRef.current, createRichText(singleLine ? plain.replace(/\s*\n\s*/g, ' ') : plain, maxLength))
    emitChange()
  }

  return (
    <div className={`${styles.wrapper} ${singleLine ? styles.singleLine : ''} ${className}`}>
      {name && <input type="hidden" name={name} value={plainValue} />}
      <div className={styles.toolbar} role="toolbar" aria-label={`${ariaLabel || name || 'Text'} formatting`}>
        <span>Text style</span>
        <div>
          <button
            type="button"
            className={!activeMarks.bold && !activeMarks.italic ? styles.active : ''}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat('removeFormat')}
            aria-label="Use normal text"
            aria-pressed={!activeMarks.bold && !activeMarks.italic}
            title="Normal text"
          >Normal</button>
          <button
            type="button"
            className={activeMarks.bold ? styles.active : ''}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat('bold')}
            aria-label="Toggle bold"
            aria-pressed={activeMarks.bold}
            title="Bold"
          ><strong>B</strong></button>
          <button
            type="button"
            className={activeMarks.italic ? styles.active : ''}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat('italic')}
            aria-label="Toggle italic"
            aria-pressed={activeMarks.italic}
            title="Italic"
          ><em>I</em></button>
        </div>
      </div>
      <div
        id={id}
        ref={editorRef}
        className={styles.editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={ariaLabel || name || 'Formatted text'}
        aria-multiline={!singleLine}
        data-placeholder={placeholder}
        onInput={emitChange}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onMouseUp={updateActiveMarks}
        onKeyUp={updateActiveMarks}
        onFocus={updateActiveMarks}
        onBlur={() => {
          if (editorRef.current && !richTextToPlainText(documentFromDom(editorRef.current, maxLength, singleLine))) {
            editorRef.current.replaceChildren()
          }
          setActiveMarks({ bold: false, italic: false })
        }}
        onKeyDown={(event) => {
          if (singleLine && event.key === 'Enter') event.preventDefault()
        }}
      />
      <span className={styles.formatHint}>Paste formatting or select text, then choose Normal, Bold, or Italic.</span>
    </div>
  )
}
