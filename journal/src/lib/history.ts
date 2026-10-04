import { useCallback, useReducer } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { JournalState } from './model';

export const HISTORY_LIMIT = 40;

export interface JournalHistoryState {
  state: JournalState;
  past: readonly JournalState[];
  future: readonly JournalState[];
  interactionStart: JournalState | null;
}

export type JournalHistoryAction =
  | { type: 'set'; update: SetStateAction<JournalState> }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'beginInteraction' }
  | { type: 'endInteraction' };

export function createHistoryState(state: JournalState): JournalHistoryState {
  return { state, past: [], future: [], interactionStart: null };
}

function appendSnapshot(snapshots: readonly JournalState[], state: JournalState): readonly JournalState[] {
  return [...snapshots.slice(-(HISTORY_LIMIT - 1)), state];
}

function interactionChanged(history: JournalHistoryState): boolean {
  return history.interactionStart !== null && history.interactionStart.books !== history.state.books;
}

function endInteraction(history: JournalHistoryState): JournalHistoryState {
  if (history.interactionStart === null) return history;
  const changed = interactionChanged(history);
  return {
    ...history,
    past: changed ? appendSnapshot(history.past, history.interactionStart) : history.past,
    future: changed ? [] : history.future,
    interactionStart: null,
  };
}

/** Immutable snapshots share their unchanged books, entries and embedded image strings. */
export function historyReducer(history: JournalHistoryState, action: JournalHistoryAction): JournalHistoryState {
  switch (action.type) {
    case 'set': {
      // React may replay this reducer in StrictMode. Updaters must remain pure, just
      // as with useState; history arrays and snapshots are never mutated here.
      const next = typeof action.update === 'function' ? action.update(history.state) : action.update;
      if (next === history.state) return history;
      if (next.books === history.state.books || history.interactionStart !== null) {
        return { ...history, state: next };
      }
      return {
        state: next,
        past: appendSnapshot(history.past, history.state),
        future: [],
        interactionStart: null,
      };
    }
    case 'beginInteraction':
      return history.interactionStart === null ? { ...history, interactionStart: history.state } : history;
    case 'endInteraction':
      return endInteraction(history);
    case 'undo': {
      const completed = endInteraction(history);
      const previous = completed.past.at(-1);
      if (!previous) return completed;
      return {
        state: previous,
        past: completed.past.slice(0, -1),
        future: appendSnapshot(completed.future, completed.state),
        interactionStart: null,
      };
    }
    case 'redo': {
      const completed = endInteraction(history);
      const next = completed.future.at(-1);
      if (!next) return completed;
      return {
        state: next,
        past: appendSnapshot(completed.past, completed.state),
        future: completed.future.slice(0, -1),
        interactionStart: null,
      };
    }
  }
}

/** History stays in memory; only the returned JournalState is saved or backed up. */
export function useJournalHistory(initial: () => JournalState): {
  state: JournalState;
  setState: Dispatch<SetStateAction<JournalState>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  beginInteraction: () => void;
  endInteraction: () => void;
} {
  const [history, dispatch] = useReducer(historyReducer, initial, initialize => createHistoryState(initialize()));
  const setState = useCallback<Dispatch<SetStateAction<JournalState>>>(update => dispatch({ type: 'set', update }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const beginInteraction = useCallback(() => dispatch({ type: 'beginInteraction' }), []);
  const finishInteraction = useCallback(() => dispatch({ type: 'endInteraction' }), []);
  const changed = interactionChanged(history);

  return {
    state: history.state,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0 || changed,
    canRedo: history.future.length > 0 && !changed,
    beginInteraction,
    endInteraction: finishInteraction,
  };
}
