'use client'

import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'

export default function FAQAccordion({ faqs = [] }) {
  const [activeIndex, setActiveIndex] = useState(null)

  if (faqs.length === 0) return null

  const toggle = (index) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <div className="faq-accordion">
      {faqs.map((faq, i) => (
        <div key={i} className={`faq-item ${activeIndex === i ? 'active' : ''}`}>
          <div className="faq-question" onClick={() => toggle(i)}>
            <span>{faq.question}</span>
            <FaChevronDown className="icon" />
          </div>
          <div className="faq-answer">
            <div className="faq-answer-inner">
              {faq.answer}
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        .faq-accordion {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .faq-item {
          background: white;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color 0.3s;
        }
        .faq-item.active {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-md);
        }
        .faq-question {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-weight: 700;
          color: var(--color-secondary);
          user-select: none;
        }
        .faq-question .icon {
          transition: transform 0.3s;
          opacity: 0.5;
        }
        .faq-item.active .icon {
          transform: rotate(180deg);
          color: var(--color-primary);
          opacity: 1;
        }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
          background: var(--color-surface);
        }
        .faq-item.active .faq-answer {
          max-height: 500px;
        }
        .faq-answer-inner {
          padding: 0 1.5rem 1.5rem 1.5rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  )
}
