import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import DataTransferCard from '../../components/DataTransferCard';
import { useTaskContext } from '../../context/TaskContext';

vi.mock('../../context/TaskContext', () => ({ useTaskContext: vi.fn() }));

vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  toastFn.success = vi.fn();
  toastFn.error = vi.fn();
  return { default: toastFn };
});

const existing = [
  { id: 1, name: 'Buy milk', factor: 'Normal', last_date: null, completed: false, archived: false,
    recurrence: 'none', tags: [], links: [], subtasks: [] },
  { id: 2, name: 'Old report', factor: 'Later', last_date: '2026-10-01', completed: true,
    completion_date: '2026-10-01T10:00:00.000Z', archived: true, recurrence: 'none',
    tags: ['dbms'], links: [], subtasks: [] }
];

const setup = (importTasks = vi.fn(async (rows) => rows)) => {
  useTaskContext.mockReturnValue({ tasks: existing, importTasks });
  render(<DataTransferCard />);
  return { importTasks, fileInput: screen.getByLabelText('Import file') };
};

const chooseFile = (input, content, name, type = 'text/csv') =>
  fireEvent.change(input, { target: { files: [new File([content], name, { type })] } });

describe('DataTransferCard', () => {
  let blobs;

  beforeEach(() => {
    vi.clearAllMocks();
    blobs = [];
    URL.createObjectURL = vi.fn((blob) => {
      blobs.push(blob);
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('exports every task, including archived ones, as JSON', async () => {
    setup();

    fireEvent.click(screen.getByText('Export JSON (backup)'));

    const data = JSON.parse(await blobs[0].text());
    expect(data.tasks.map(t => t.name)).toEqual(['Buy milk', 'Old report']);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Exported 2 tasks');
  });

  it('exports CSV with a BOM for Excel', async () => {
    setup();

    fireEvent.click(screen.getByText('Export CSV (spreadsheet)'));

    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    expect(await blobs[0].text()).toContain('Old report,Later,2026-10-01,,archived');
  });

  it('previews an import, skipping duplicates and invalid rows, then imports', async () => {
    const { importTasks, fileInput } = setup();

    chooseFile(fileInput, 'name,priority,deadline\nBuy milk,,\nGym,Urgent,2026-12-01\n,Later,\nRead,,\n', 'list.csv');

    const preview = within(await screen.findByRole('region', { name: 'Import preview' }));
    expect(preview.getByText('Ready to import 2 tasks from list.csv')).toBeInTheDocument();
    expect(preview.getByText('Skipping 1 duplicate you already have')).toBeInTheDocument();
    expect(preview.getByText(/Skipping 1 invalid row: row 4: missing name/)).toBeInTheDocument();

    fireEvent.click(preview.getByText('Import 2 tasks'));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Imported 2 tasks'));
    expect(importTasks.mock.calls[0][0].map(t => t.name)).toEqual(['Gym', 'Read']);
    expect(importTasks.mock.calls[0][0][0]).toMatchObject({ factor: 'Urgent', last_date: '2026-12-01' });
    expect(screen.queryByRole('region', { name: 'Import preview' })).not.toBeInTheDocument();
  });

  it('cancelling an import writes nothing', async () => {
    const { importTasks, fileInput } = setup();

    chooseFile(fileInput, '[{"name":"New"}]', 'backup.json', 'application/json');
    fireEvent.click(await screen.findByText('Cancel'));

    expect(importTasks).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Import preview' })).not.toBeInTheDocument();
  });

  it('reports partial imports', async () => {
    const error = Object.assign(new Error('network down'), { importedCount: 1 });
    const { fileInput } = setup(vi.fn().mockRejectedValue(error));

    chooseFile(fileInput, '[{"name":"A"},{"name":"B"}]', 'backup.json', 'application/json');
    fireEvent.click(await screen.findByText('Import 2 tasks'));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error.mock.calls[0][0]).toMatch(/Imported 1 of 2 tasks, then failed: network down/);
  });

  it('shows file errors instead of a preview', async () => {
    const { fileInput } = setup();

    chooseFile(fileInput, 'title,date\nA,B\n', 'bad.csv');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('The CSV needs a "name" column.'));
    expect(screen.queryByRole('region', { name: 'Import preview' })).not.toBeInTheDocument();
  });

  it('rejects files over 5 MB without reading them', async () => {
    const { fileInput } = setup();
    const big = new File(['x'], 'big.json');
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [big] } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That file is larger than 5 MB.'));
  });
});
