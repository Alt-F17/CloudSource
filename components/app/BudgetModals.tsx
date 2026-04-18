'use client'

import { useEffect, useState } from 'react'

import { useAppState, type BudgetCategory } from '@/components/app/AppStateProvider'

type ExpenseFormState = {
  label: string
  amount: string
  currency: string
  category: BudgetCategory | ''
  date: string
}

type ExpenseErrors = {
  label: boolean
  amount: boolean
  category: boolean
  date: boolean
}

type BudgetErrors = {
  total: boolean
  currency: boolean
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_EXPENSE_ERRORS: ExpenseErrors = {
  label: false,
  amount: false,
  category: false,
  date: false,
}

const EMPTY_BUDGET_ERRORS: BudgetErrors = {
  total: false,
  currency: false,
}

export function BudgetModals() {
  const {
    state,
    addBudgetExpense,
    setBudgetConfig,
    closeBudgetExpenseModal,
    closeBudgetConfigModal,
  } = useAppState()

  const [expense, setExpense] = useState<ExpenseFormState>({
    label: '',
    amount: '',
    currency: state.budgetCurrency,
    category: '',
    date: todayIso(),
  })
  const [expenseErrors, setExpenseErrors] = useState<ExpenseErrors>(EMPTY_EXPENSE_ERRORS)

  const [budgetTotal, setBudgetTotal] = useState(String(state.budgetTotal))
  const [budgetCurrency, setBudgetCurrency] = useState(state.budgetCurrency)
  const [budgetErrors, setBudgetErrors] = useState<BudgetErrors>(EMPTY_BUDGET_ERRORS)

  useEffect(() => {
    if (!state.budgetExpenseModalOpen) return

    const prefill = state.budgetExpensePrefill
    setExpense({
      label: prefill?.label ?? '',
      amount: typeof prefill?.amount === 'number' ? String(prefill.amount) : '',
      currency: prefill?.currency ?? state.budgetCurrency,
      category: prefill?.category ?? '',
      date: prefill?.date ?? todayIso(),
    })
    setExpenseErrors(EMPTY_EXPENSE_ERRORS)
  }, [state.budgetExpenseModalOpen, state.budgetExpensePrefill, state.budgetCurrency])

  useEffect(() => {
    if (!state.budgetConfigModalOpen) return
    setBudgetTotal(String(state.budgetTotal))
    setBudgetCurrency(state.budgetCurrency)
    setBudgetErrors(EMPTY_BUDGET_ERRORS)
  }, [state.budgetConfigModalOpen, state.budgetTotal, state.budgetCurrency])

  function updateExpenseField<K extends keyof ExpenseFormState>(key: K, value: ExpenseFormState[K]) {
    setExpense((prev) => ({ ...prev, [key]: value }))
    if (expenseErrors[key as keyof ExpenseErrors]) {
      setExpenseErrors((prev) => ({ ...prev, [key]: false }))
    }
  }

  function submitExpense() {
    const amount = Number(expense.amount)
    const category = expense.category
    const nextErrors: ExpenseErrors = {
      label: !expense.label.trim(),
      amount: !Number.isFinite(amount) || amount <= 0,
      category: !category,
      date: !expense.date,
    }
    setExpenseErrors(nextErrors)

    if (nextErrors.label || nextErrors.amount || nextErrors.category || nextErrors.date) {
      return
    }

    if (!category) {
      return
    }

    addBudgetExpense({
      label: expense.label.trim(),
      amount,
      currency: expense.currency.trim() || state.budgetCurrency,
      category,
      date: expense.date,
    })
    closeBudgetExpenseModal()
  }

  function submitBudget() {
    const parsed = Number(budgetTotal)
    const nextErrors: BudgetErrors = {
      total: !Number.isFinite(parsed) || parsed <= 0,
      currency: !budgetCurrency.trim(),
    }
    setBudgetErrors(nextErrors)

    if (nextErrors.total || nextErrors.currency) {
      return
    }

    setBudgetConfig({
      total: parsed,
      currency: budgetCurrency.trim(),
    })
    closeBudgetConfigModal()
  }

  return (
    <>
      {state.budgetExpenseModalOpen && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeBudgetExpenseModal()
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-title">💳 Add Expense</div>
            <div className="modal-row">
              <div className="fg">
                <label>Description *</label>
                <input
                  className={`inp ${expenseErrors.label ? 'err' : ''}`}
                  id="exp-label"
                  placeholder="e.g. Flight to Tokyo"
                  maxLength={80}
                  value={expense.label}
                  onChange={(event) => updateExpenseField('label', event.target.value)}
                />
                <span className={`err-msg ${expenseErrors.label ? 'show' : ''}`}>Description is required.</span>
              </div>
            </div>
            <div className="modal-row two">
              <div className="fg">
                <label>Amount *</label>
                <input
                  className={`inp ${expenseErrors.amount ? 'err' : ''}`}
                  id="exp-amount"
                  type="number"
                  placeholder="0.00"
                  min={0.01}
                  step={0.01}
                  value={expense.amount}
                  onChange={(event) => updateExpenseField('amount', event.target.value)}
                />
                <span className={`err-msg ${expenseErrors.amount ? 'show' : ''}`}>Enter a valid amount.</span>
              </div>
              <div className="fg">
                <label>Currency</label>
                <input
                  className="inp"
                  id="exp-currency"
                  placeholder="£"
                  maxLength={5}
                  value={expense.currency}
                  onChange={(event) => updateExpenseField('currency', event.target.value)}
                />
              </div>
            </div>
            <div className="modal-row">
              <div className="fg">
                <label>Category *</label>
                <select
                  className={`inp ${expenseErrors.category ? 'err' : ''}`}
                  id="exp-category"
                  value={expense.category}
                  onChange={(event) => updateExpenseField('category', event.target.value as BudgetCategory | '')}
                >
                  <option value="">Select category...</option>
                  <option value="flights">✈️ Flights</option>
                  <option value="hotels">🏨 Hotels</option>
                  <option value="food">🍜 Food &amp; Dining</option>
                  <option value="activities">🎌 Activities</option>
                  <option value="transport">🚇 Transport</option>
                  <option value="other">💰 Other</option>
                </select>
                <span className={`err-msg ${expenseErrors.category ? 'show' : ''}`}>Please select a category.</span>
              </div>
            </div>
            <div className="modal-row">
              <div className="fg">
                <label>Date *</label>
                <input
                  className={`inp ${expenseErrors.date ? 'err' : ''}`}
                  id="exp-date"
                  type="date"
                  value={expense.date}
                  onChange={(event) => updateExpenseField('date', event.target.value)}
                />
                <span className={`err-msg ${expenseErrors.date ? 'show' : ''}`}>Date is required.</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closeBudgetExpenseModal}>Cancel</button>
              <button className="btn btn-primary" onClick={submitExpense}>Add Expense</button>
            </div>
          </div>
        </div>
      )}

      {state.budgetConfigModalOpen && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeBudgetConfigModal()
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-title">💰 Set Total Budget</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
              Only <strong style={{ color: 'white' }}>you</strong> and <strong style={{ color: 'var(--pink-soft)' }}>Nimbus ☁️</strong> can set the trip budget.
            </div>
            <div className="modal-row two">
              <div className="fg">
                <label>Total Amount *</label>
                <input
                  className={`inp ${budgetErrors.total ? 'err' : ''}`}
                  id="bud-total"
                  type="number"
                  placeholder="3200"
                  min={1}
                  step={1}
                  value={budgetTotal}
                  onChange={(event) => {
                    setBudgetTotal(event.target.value)
                    if (budgetErrors.total) setBudgetErrors((prev) => ({ ...prev, total: false }))
                  }}
                />
                <span className={`err-msg ${budgetErrors.total ? 'show' : ''}`}>Enter a valid amount.</span>
              </div>
              <div className="fg">
                <label>Currency *</label>
                <input
                  className={`inp ${budgetErrors.currency ? 'err' : ''}`}
                  id="bud-currency"
                  placeholder="£"
                  maxLength={5}
                  value={budgetCurrency}
                  onChange={(event) => {
                    setBudgetCurrency(event.target.value)
                    if (budgetErrors.currency) setBudgetErrors((prev) => ({ ...prev, currency: false }))
                  }}
                />
                <span className={`err-msg ${budgetErrors.currency ? 'show' : ''}`}>Currency is required.</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closeBudgetConfigModal}>Cancel</button>
              <button className="btn btn-primary" onClick={submitBudget}>Save Budget</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
