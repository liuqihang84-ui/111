import { describe, expect, it } from 'vitest';
import type { SetStateAction } from 'react';
import { createHistoryState, historyReducer, HISTORY_LIMIT, type JournalHistoryState } from './history';
import { createEntry, validateState, type JournalState } from './model';

function initialState(): JournalState {
  const date = '2026-10-04';
  return {
    version: 1,
    activeBookId: 'book-1',
    activeDate: date,
    books: [{
      id: 'book-1', title: '日常', subtitle: '', cover: 'mountain',
      entries: { [date]: { ...createEntry(date), objects: [{
        id: 'sticker-1', kind: 'sticker', assetId: 'icon-orchid',
        x: 60, y: 80, width: 100, height: 100, rotation: 0,
      }] } },
    }],
  };
}

function set(history: JournalHistoryState, update: SetStateAction<JournalState>): JournalHistoryState {
  return historyReducer(history, { type: 'set', update });
}

function rename(title: string): (state: JournalState) => JournalState {
  return state => ({ ...state, books: state.books.map(book => ({ ...book, title })) });
}

function move(x: number): (state: JournalState) => JournalState {
  return state => ({ ...state, books: state.books.map(book => ({
    ...book,
    entries: {
      ...book.entries,
      [state.activeDate]: {
        ...book.entries[state.activeDate],
        objects: book.entries[state.activeDate].objects.map(object => ({ ...object, x })),
      },
    },
  })) });
}

describe('journal history', () => {
  it('groups every move in one interaction into one undo and redo', () => {
    const original = initialState();
    let history = historyReducer(createHistoryState(original), { type: 'beginInteraction' });
    history = set(history, move(100));
    history = set(history, move(200));
    history = set(history, move(300));
    expect(history.past).toHaveLength(0);
    expect(history.interactionStart).toBe(original);
    history = historyReducer(history, { type: 'endInteraction' });
    const moved = history.state;
    expect(history.past).toEqual([original]);
    expect(history.interactionStart).toBeNull();
    history = historyReducer(history, { type: 'undo' });
    expect(history.state).toBe(original);
    expect(history.state.books[0].entries[original.activeDate].objects[0].x).toBe(60);
    history = historyReducer(history, { type: 'redo' });
    expect(history.state).toBe(moved);
    expect(history.state.books[0].entries[original.activeDate].objects[0].x).toBe(300);
  });

  it('clears redo when a new edit follows undo', () => {
    let history = createHistoryState(initialState());
    history = set(history, rename('first'));
    history = set(history, rename('second'));
    history = historyReducer(history, { type: 'undo' });
    expect(history.future).toHaveLength(1);
    history = set(history, rename('replacement'));
    expect(history.future).toHaveLength(0);
    expect(historyReducer(history, { type: 'redo' })).toBe(history);
    expect(historyReducer(history, { type: 'undo' }).state.books[0].title).toBe('first');
  });

  it('does not record book/date navigation or discard redo', () => {
    const original = initialState();
    let history = set(createHistoryState(original), rename('changed'));
    history = historyReducer(history, { type: 'undo' });
    const previousPast = history.past;
    const previousFuture = history.future;
    history = set(history, current => ({ ...current, activeDate: '2026-10-05', activeBookId: 'another-book' }));
    expect(history.state.activeDate).toBe('2026-10-05');
    expect(history.past).toBe(previousPast);
    expect(history.future).toBe(previousFuture);
    expect(history.state.books).toBe(original.books);
    expect(historyReducer(history, { type: 'redo' }).state.books[0].title).toBe('changed');
  });

  it('captures the current navigation before an edit so undo returns to the edited page', () => {
    let history = createHistoryState(initialState());
    history = set(history, current => ({ ...current, activeDate: '2026-10-05' }));
    const navigated = history.state;
    history = set(history, rename('after navigation'));
    history = historyReducer(history, { type: 'undo' });
    expect(history.state).toBe(navigated);
    expect(history.state.activeDate).toBe('2026-10-05');
  });

  it('applies queued functional actions to the latest state', () => {
    let history = createHistoryState(initialState());
    const append = (state: JournalState) => rename(`${state.books[0].title}!`)(state);
    history = set(history, append);
    history = set(history, append);
    history = set(history, append);
    expect(history.state.books[0].title).toBe('日常!!!');
    expect(history.past.map(snapshot => snapshot.books[0].title)).toEqual(['日常', '日常!', '日常!!']);
  });

  it('retains at most forty snapshots and stops at the oldest retained edit', () => {
    let history = createHistoryState(initialState());
    for (let index = 1; index <= 47; index += 1) history = set(history, rename(String(index)));
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    for (let index = 0; index < HISTORY_LIMIT; index += 1) history = historyReducer(history, { type: 'undo' });
    expect(history.state.books[0].title).toBe('7');
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(HISTORY_LIMIT);
    expect(historyReducer(history, { type: 'undo' })).toBe(history);
    for (let index = 0; index < HISTORY_LIMIT; index += 1) history = historyReducer(history, { type: 'redo' });
    expect(history.state.books[0].title).toBe('47');
    expect(history.future).toHaveLength(0);
    expect(history.past).toHaveLength(HISTORY_LIMIT);
  });

  it('ignores identity updates and empty interactions', () => {
    const initial = createHistoryState(initialState());
    expect(set(initial, state => state)).toBe(initial);
    expect(set(initial, initial.state)).toBe(initial);
    expect(historyReducer(initial, { type: 'endInteraction' })).toBe(initial);
    expect(historyReducer(initial, { type: 'undo' })).toBe(initial);
    expect(historyReducer(initial, { type: 'redo' })).toBe(initial);
    const started = historyReducer(initial, { type: 'beginInteraction' });
    expect(historyReducer(started, { type: 'beginInteraction' })).toBe(started);
    const completed = historyReducer(started, { type: 'endInteraction' });
    expect(completed.state).toBe(initial.state);
    expect(completed.past).toHaveLength(0);
    expect(completed.future).toHaveLength(0);
  });

  it('keeps navigation-only gestures out of history', () => {
    let history = historyReducer(createHistoryState(initialState()), { type: 'beginInteraction' });
    history = set(history, state => ({ ...state, activeDate: '2026-10-05' }));
    history = historyReducer(history, { type: 'endInteraction' });
    expect(history.state.activeDate).toBe('2026-10-05');
    expect(history.past).toHaveLength(0);
  });

  it('preserves redo when an interaction returns to its original book references', () => {
    let history = set(createHistoryState(initialState()), rename('changed'));
    history = historyReducer(history, { type: 'undo' });
    const original = history.state;
    const future = history.future;
    history = historyReducer(history, { type: 'beginInteraction' });
    history = set(history, rename('temporary'));
    history = set(history, original);
    history = historyReducer(history, { type: 'endInteraction' });
    expect(history.past).toHaveLength(0);
    expect(history.future).toBe(future);
  });

  it('finalizes an interrupted gesture before undo or redo', () => {
    const original = initialState();
    let history = historyReducer(createHistoryState(original), { type: 'beginInteraction' });
    history = set(history, move(200));
    const moved = history.state;
    history = historyReducer(history, { type: 'undo' });
    expect(history.state).toBe(original);
    expect(history.interactionStart).toBeNull();
    history = historyReducer(history, { type: 'redo' });
    expect(history.state).toBe(moved);
    history = historyReducer(history, { type: 'undo' });
    history = historyReducer(history, { type: 'beginInteraction' });
    history = set(history, move(300));
    history = historyReducer(history, { type: 'redo' });
    expect(history.state.books[0].entries[original.activeDate].objects[0].x).toBe(300);
    expect(history.future).toHaveLength(0);
    expect(history.interactionStart).toBeNull();
    expect(history.past).toEqual([original]);
  });

  it('can be replayed in StrictMode without mutating snapshots or history arrays', () => {
    const original = initialState();
    Object.freeze(original.books);
    Object.freeze(original);
    const history = createHistoryState(original);
    Object.freeze(history.past);
    Object.freeze(history.future);
    Object.freeze(history);
    const action = { type: 'set' as const, update: rename('changed') };
    const first = historyReducer(history, action);
    const replayed = historyReducer(history, action);
    expect(first).toEqual(replayed);
    expect(first.past).toHaveLength(1);
    expect(replayed.past).toHaveLength(1);
    expect(history.past).toHaveLength(0);
    expect(first.past[0]).toBe(original);
    expect(original.books[0].title).toBe('日常');
  });

  it('keeps the persisted JournalState shape and shares unchanged entry references', () => {
    const original = initialState();
    const history = set(createHistoryState(original), rename('changed'));
    expect(history.past[0]).toBe(original);
    expect(history.state.books[0].entries).toBe(original.books[0].entries);
    expect(Object.keys(history.state).sort()).toEqual(['activeBookId', 'activeDate', 'books', 'version']);
    expect(validateState(JSON.parse(JSON.stringify(history.state)))).toEqual(history.state);
    expect(createHistoryState(history.state).past).toHaveLength(0);
    expect(createHistoryState(history.state).future).toHaveLength(0);
  });
});
