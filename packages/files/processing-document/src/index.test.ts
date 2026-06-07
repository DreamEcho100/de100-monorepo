import { describe, expect, it } from "vitest";

import {
	createFilesDocumentProcessingPlan,
	detectFilesDocumentKind,
	detectFilesOfficeDocumentFormat,
	getFilesDocumentPreviewContentType,
} from "./index";

describe("document processing planning", () => {
	it("detects PDF and Office documents", () => {
		expect(
			detectFilesDocumentKind({ contentType: "application/pdf", fileName: "report.bin" }),
		).toBe("pdf");
		expect(detectFilesDocumentKind({ fileName: "deck.pptx" })).toBe("office");
		expect(detectFilesDocumentKind({ fileName: "notes.txt" })).toBe("unknown");
		expect(detectFilesOfficeDocumentFormat("sheet.xlsx")).toBe("xlsx");
	});

	it("plans PDF metadata and preview output", () => {
		const plan = createFilesDocumentProcessingPlan({
			contentType: "application/pdf",
			fileName: "report.pdf",
			preset: { pdfMetadata: true, preview: { format: "png", pageLimit: 3 } },
			storagePrefix: "files/doc-1/",
		});

		expect(plan).toEqual({
			documentKind: "pdf",
			metadata: true,
			preview: {
				contentType: "image/png",
				format: "png",
				key: "files/doc-1/preview.png",
				pageLimit: 3,
			},
		});
	});

	it("requires explicit Office proof-of-concept opt-in for previews", () => {
		expect(() =>
			createFilesDocumentProcessingPlan({
				fileName: "report.docx",
				preset: { pdfMetadata: true, preview: true },
				storagePrefix: "files/doc-2",
			}),
		).toThrow("officeProofOfConcept");

		expect(
			createFilesDocumentProcessingPlan({
				fileName: "report.docx",
				preset: { officeProofOfConcept: true, pdfMetadata: true, preview: true },
				storagePrefix: "files/doc-2",
			}).officeConversion,
		).toEqual({
			enabled: true,
			sourceFormat: "docx",
			targetFormat: "pdf",
		});
		expect(getFilesDocumentPreviewContentType("pdf")).toBe("application/pdf");
	});
});
