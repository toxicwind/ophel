import React, { useState, useMemo } from "react"
import type { ArchivistMessage } from "../types"
import "./OutlineSelect.css"

interface OutlineSelectProps {
  messages: ArchivistMessage[]
  onSelectionChange: (selectedIds: string[]) => void
}

export const OutlineSelect: React.FC<OutlineSelectProps> = ({ messages, onSelectionChange }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")

  // Filter messages to show only user prompts
  const userPrompts = useMemo(() => {
    return messages.filter(
      (m) => m.role === "user" && m.text.toLowerCase().includes(filter.toLowerCase()),
    )
  }, [messages, filter])

  const togglePrompt = (msg: ArchivistMessage) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(msg.id)) {
      newSelected.delete(msg.id)
      // also delete next message if it was auto-selected (simplified logic)
      const nextMsg = messages[messages.indexOf(msg) + 1]
      if (nextMsg && nextMsg.role === "assistant") {
        newSelected.delete(nextMsg.id)
      }
    } else {
      newSelected.add(msg.id)
      // automatically include following assistant response
      const nextMsg = messages[messages.indexOf(msg) + 1]
      if (nextMsg && nextMsg.role === "assistant") {
        newSelected.add(nextMsg.id)
      }
    }
    setSelectedIds(newSelected)
    onSelectionChange(Array.from(newSelected))
  }

  const selectAll = () => {
    const newSelected = new Set(selectedIds)
    userPrompts.forEach((p) => {
      newSelected.add(p.id)
      const idx = messages.indexOf(p)
      const next = messages[idx + 1]
      if (next && next.role === "assistant") newSelected.add(next.id)
    })
    setSelectedIds(newSelected)
    onSelectionChange(Array.from(newSelected))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
    onSelectionChange([])
  }

  return (
    <div className="archivist-outline-select">
      <div className="archivist-controls">
        <input
          className="archivist-filter-input"
          placeholder="Filter prompts..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className="archivist-btn" onClick={selectAll}>
          All
        </button>
        <button className="archivist-btn" onClick={selectNone}>
          None
        </button>
      </div>
      <div className="archivist-list">
        {userPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`archivist-row ${selectedIds.has(prompt.id) ? "selected" : ""}`}
            onClick={() => togglePrompt(prompt)}>
            <div className="archivist-row-content">
              {prompt.text.length > 100 ? prompt.text.substring(0, 100) + "..." : prompt.text}
            </div>
            {selectedIds.has(prompt.id) && <span className="archivist-check">✓</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
