import React from 'react'

import { MARKET_AREAS, MARKET_CATEGORIES } from '../../lib/marketplaceOptions'

/**
 * Marketplace search as a plain GET form (works without JavaScript). It posts
 * to /marketplace/all, which redirects to the chosen category's page.
 */
export function SearchBar({
  category = '',
  area = '',
  date = '',
  budget = '',
  q = '',
  sort = '',
  compact = false,
}: {
  category?: string
  area?: string
  date?: string
  budget?: string
  q?: string
  sort?: string
  compact?: boolean
}) {
  return (
    <form className={`mk-search ${compact ? 'mk-search--compact' : ''}`} action="/marketplace/all" method="get">
      <label className="field">
        <span className="field__label">Looking for</span>
        <select name="cat" defaultValue={category}>
          <option value="">All services</option>
          {MARKET_CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">Area</span>
        <select name="area" defaultValue={area}>
          <option value="">Anywhere in Chennai</option>
          {MARKET_AREAS.filter((a) => a !== 'All over Chennai').map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">Event date</span>
        <input type="date" name="date" defaultValue={date} />
      </label>
      {compact && (
        <>
          <label className="field">
            <span className="field__label">Max starting price (₹)</span>
            <input type="number" name="budget" min={0} inputMode="numeric" defaultValue={budget} placeholder="Any" />
          </label>
          <label className="field">
            <span className="field__label">Name or keyword</span>
            <input type="search" name="q" defaultValue={q} placeholder="e.g. candid" />
          </label>
          <label className="field">
            <span className="field__label">Sort</span>
            <select name="sort" defaultValue={sort}>
              <option value="">Recommended</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="new">Newest</option>
            </select>
          </label>
        </>
      )}
      <button className="btn btn--gold mk-search__go" type="submit">
        Search
      </button>
    </form>
  )
}
