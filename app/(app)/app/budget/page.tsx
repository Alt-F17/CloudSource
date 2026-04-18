'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { TripSidebar } from '@/components/app/TripSidebar'
import { useAppState } from '@/components/app/AppStateProvider'

export default function BudgetPage() {
  const router = useRouter()
  const {
    activeTrip,
    state,
    openBudgetExpenseModal,
    openBudgetConfigModal,
  } = useAppState()

  const spent = useMemo(
    () => state.budgetExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [state.budgetExpenses]
  )

  const remaining = Math.max(0, state.budgetTotal - spent)
  const usedPct = state.budgetTotal > 0 ? Math.min(100, Math.round((spent / state.budgetTotal) * 100)) : 0

  const daysLeft = useMemo(() => {
    const depart = new Date(state.flightSearch.departDate)
    if (Number.isNaN(depart.getTime())) return 0
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.max(0, Math.ceil((depart.getTime() - Date.now()) / msPerDay))
  }, [state.flightSearch.departDate])

  const totalsByCategory = useMemo(() => {
    return state.budgetExpenses.reduce(
      (acc, expense) => {
        if (expense.category === 'flights') acc.flights += expense.amount
        else if (expense.category === 'hotels') acc.hotels += expense.amount
        else if (expense.category === 'food') acc.food += expense.amount
        else if (expense.category === 'activities') acc.activities += expense.amount
        return acc
      },
      { flights: 0, hotels: 0, food: 0, activities: 0 }
    )
  }, [state.budgetExpenses])

  function exportCsv() {
    const rows = [['Description', 'Amount', 'Currency', 'Category', 'Date']]
    for (const expense of state.budgetExpenses) {
      rows.push([
        `"${expense.label.replace(/"/g, '""')}"`,
        String(expense.amount),
        expense.currency,
        expense.category,
        expense.date,
      ])
    }

    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeTrip.destination.name.toLowerCase().replace(/\s+/g, '-')}-budget.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const categoryBg: Record<string, string> = {
    flights: 'var(--pink-dim)',
    hotels: 'var(--blue-dim)',
    food: 'rgba(34,197,94,.1)',
    transport: 'rgba(139,92,246,.1)',
    activities: 'rgba(251,191,36,.1)',
    other: 'rgba(255,255,255,.08)',
  }

  const categoryAmtClass: Record<string, string> = {
    flights: 't-pink',
    hotels: 't-blue',
  }

  return (
    <div className="app">
      <TripSidebar />
      <main className="main">
        <div id="screen-budget" className="screen">
          <div className="budget-wrap">
            <div className="ph">
              <div className="ph-icon">💳</div>
              <div>
                <h1>Budget</h1>
                <div className="ph-sub">{activeTrip.name} · {activeTrip.meta}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ padding: '8px 13px', fontSize: 12 }} onClick={() => openBudgetExpenseModal()}>
                  + Add Expense
                </button>
                <button className="btn btn-ghost" style={{ padding: '8px 13px', fontSize: 12 }} onClick={openBudgetConfigModal}>
                  💰 Set Budget
                </button>
                <button className="btn btn-secondary" style={{ padding: '8px 13px', fontSize: 12 }} onClick={exportCsv}>Export CSV</button>
                <button className="btn btn-ghost" onClick={() => router.push('/app')} style={{ padding: '8px 13px', fontSize: 12 }}>← Back to Globe</button>
              </div>
            </div>

            <div className="budget-hero">
              <div className="budget-sub">Total Budget</div>
              <div className="budget-total">{state.budgetCurrency} {state.budgetTotal.toLocaleString()}</div>
              <div className="bbar-wrap">
                <div className="bbar-labels">
                  <span>{state.budgetCurrency}{spent.toLocaleString()} spent</span>
                  <span>{state.budgetCurrency}{remaining.toLocaleString()} remaining</span>
                </div>
                <div className="bbar"><div className="bbar-fill" style={{ width: `${usedPct}%` }} /></div>
                <div className="bbar-meta">{usedPct}% used · {daysLeft} days left</div>
              </div>
            </div>

            <div className="budget-stats">
              <div className="bstat card-pink"><div className="bstat-val t-pink">{state.budgetCurrency} {totalsByCategory.flights.toLocaleString()}</div><div className="bstat-lbl">Flights</div></div>
              <div className="bstat card-blue"><div className="bstat-val t-blue">{state.budgetCurrency} {totalsByCategory.hotels.toLocaleString()}</div><div className="bstat-lbl">Accommodation</div></div>
              <div className="bstat"><div className="bstat-val">{state.budgetCurrency} {totalsByCategory.food.toLocaleString()}</div><div className="bstat-lbl">Food & Dining</div></div>
              <div className="bstat"><div className="bstat-val">{state.budgetCurrency} {totalsByCategory.activities.toLocaleString()}</div><div className="bstat-lbl">Activities</div></div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 6 }}>Recent Expenses</h3>
              {state.budgetExpenses.map((expense) => (
                <div key={expense.id} className="expense-row">
                  <div className="exp-ico" style={{ background: categoryBg[expense.category] ?? categoryBg.other }}>
                    {expense.icon}
                  </div>
                  <div className="exp-name">
                    <div className="name">{expense.label}</div>
                    <div className="date">{expense.date}</div>
                  </div>
                  <div className={`exp-amt ${categoryAmtClass[expense.category] ?? ''}`}>
                    {expense.currency} {expense.amount.toLocaleString()}.00
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
