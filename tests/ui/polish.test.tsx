import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DashboardApp } from '../../src/dashboard/App';
import { PopupApp } from '../../src/popup/App';
import { SidepanelApp } from '../../src/sidepanel/App';
import { MergeSplitModal } from '../../src/components/MergeSplitModal';
import { createDemoDataset } from '../../src/demo/demoDataset';
import { storageManager } from '../../src/storage/storageManager';

beforeEach(async () => { await storageManager.clearAllData(); await storageManager.saveThreads(createDemoDataset()); });

describe('Polished extension UI workflows', () => {
  it('keeps modal keyboard focus inside and restores the trigger on Escape', async () => {
    render(<DashboardApp />);
    await screen.findByRole('heading', { name: 'Submit EurekaDev Project' });
    const trigger = screen.getAllByTitle('Why were these tabs grouped?')[0];
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Why was this grouped?' });
    const first = within(dialog).getByRole('button', { name: 'Close dialog' });
    const last = within(dialog).getByRole('button', { name: 'Got it' });
    expect(first).toHaveFocus();
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dialog).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
  it('renames, archives and finds a thread through the archived filter', async () => {
    render(<DashboardApp />);
    await screen.findByRole('heading', { name: 'Submit EurekaDev Project' });
    fireEvent.click(screen.getAllByTitle('Rename Intent')[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Task title' }), { target: { value: 'Finish presentation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save task title' }));
    expect(await screen.findByRole('heading', { name: 'Finish presentation' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Task actions' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
    expect(screen.getByRole('button', { name: 'Archived' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Finish presentation' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Submit EurekaDev Project' })).not.toBeInTheDocument();
    await waitFor(async () => expect(Object.values((await storageManager.load()).threads).some(t => t.title === 'Finish presentation' && t.status === 'ARCHIVED')).toBe(true));
  });
  it('selects a recent popup task by keyboard-compatible button and resumes it', async () => {
    render(<PopupApp />);
    fireEvent.click(await screen.findByRole('button', { name: 'Select Submit EurekaDev Project' }));
    expect(screen.getByRole('heading', { name: 'Submit EurekaDev Project' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume Task Context' }));
    expect(await screen.findByRole('dialog', { name: 'Resume briefing' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(async () => expect((await storageManager.load()).threads['demo-thread-eurekadev'].status).toBe('LIKELY_COMPLETE'));
  });
  it('searches and resumes a task in the companion page', async () => {
    render(<SidepanelApp />);
    await screen.findByRole('heading', { name: 'Submit EurekaDev Project' });
    fireEvent.change(screen.getByPlaceholderText('Search intents...'), { target: { value: 'headphones' } });
    expect(screen.getByRole('heading', { name: 'Compare ANC Headphones' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Submit EurekaDev Project' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(await screen.findByRole('dialog', { name: 'Resume briefing' })).toBeInTheDocument();
    await waitFor(async () => expect((await storageManager.load()).threads['demo-thread-headphones'].status).toBe('ACTIVE'));
  });
  it('does not restore erased AI/privacy settings from stale dashboard state', async () => {
    await storageManager.saveAISettings({ enabled: true, provider: 'openai', apiKey: 'synthetic-fixture-key', modelName: '', customEndpoint: '' });
    render(<DashboardApp />);
    await screen.findByRole('heading', { name: 'Submit EurekaDev Project' });
    fireEvent.click(screen.getByRole('button', { name: 'Privacy Center' }));
    expect(screen.getByLabelText('Remote AI (unavailable)')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Erase All ThreadBack Data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Erase Everything' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Privacy Center' }));
    expect(screen.getByLabelText('Remote AI (unavailable)')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));
    await waitFor(async () => expect((await storageManager.load()).aiSettings.apiKey).toBe(''));
  }, 60000);
  it('resets stale split selections and supports keyboard tab selection', () => {
    const demo = createDemoDataset();
    const props = { allThreads: demo, onClose: vi.fn(), onMerge: vi.fn(), onSplit: vi.fn() };
    const view = render(<MergeSplitModal {...props} sourceThread={demo[0]} />);
    const first = screen.getAllByRole('checkbox')[0];
    fireEvent.keyDown(first, { key: ' ' });
    expect(first).toHaveAttribute('aria-checked', 'true');
    view.rerender(<MergeSplitModal {...props} sourceThread={null} />);
    view.rerender(<MergeSplitModal {...props} sourceThread={demo[1]} />);
    expect(screen.getAllByRole('checkbox').every(item => item.getAttribute('aria-checked') === 'false')).toBe(true);
    for (const item of screen.getAllByRole('checkbox')) fireEvent.click(item);
    const submit = screen.getByRole('dialog').querySelector('button[type="submit"]');
    expect(submit).toBeDisabled();
  });
});
