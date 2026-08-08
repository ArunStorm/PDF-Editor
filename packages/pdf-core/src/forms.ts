import { PDFDocument } from 'pdf-lib';

export type FormFieldInfo = { name: string; type: string };

export async function listFormFields(input: ArrayBuffer | Uint8Array): Promise<FormFieldInfo[]> {
  const document = await PDFDocument.load(input);
  return document.getForm().getFields().map((field) => ({ name: field.getName(), type: field.constructor.name }));
}

/** Fill common AcroForm field types. Values are intentionally string/boolean based for a predictable UI. */
export async function fillFormFields(input: ArrayBuffer | Uint8Array, values: Record<string, string | boolean>): Promise<Uint8Array> {
  const document = await PDFDocument.load(input);
  const form = document.getForm();

  for (const [name, value] of Object.entries(values)) {
    const field = form.getFieldMaybe(name);
    if (!field) continue;
    const type = field.constructor.name;
    if (type === 'PDFTextField' && typeof value === 'string') (field as any).setText(value);
    else if (type === 'PDFCheckBox' && typeof value === 'boolean') value ? (field as any).check() : (field as any).uncheck();
    else if (type === 'PDFDropdown' && typeof value === 'string') (field as any).select(value);
    else if (type === 'PDFRadioGroup' && typeof value === 'string') (field as any).select(value);
  }

  form.updateFieldAppearances(form.getDefaultFont());
  return document.save({ useObjectStreams: true });
}

export async function flattenForm(input: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const document = await PDFDocument.load(input);
  document.getForm().flatten();
  return document.save({ useObjectStreams: true });
}
