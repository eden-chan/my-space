import { useRef, useState } from "react";
import {
	HighlightArea,
	RenderHighlightsProps,
	RenderHighlightTargetProps,
} from "@react-pdf-viewer/highlight";

// modified highlightPlugin to handle selecting non-pdf content that causes re-rendering issue
const highlightPlugin = require("./highlight.js").highlightPlugin;
import { Viewer } from "@react-pdf-viewer/core";
import { useAskHighlight } from "@src/context/ask-highlight-context";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { NewHighlightWithRelationsInput } from "@src/server/api/routers/highlight";
import { Highlight } from "@prisma/client";
import {
	AnnotatedPdfWithProfile,
	HighlightWithRelations,
} from "@src/lib/types";
import { Sidebar } from "@/components/pdf/Sidebar";
import { clientApi } from "@src/trpc/react";
import { Forest } from "@/components/pdf/Forest";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import FloatingProfiles from "@/components/pdf/FloatingProfiles";
import { ReactFlowProvider } from "reactflow";
import { PastNote } from "./PastNote";
import { HighlightedArea } from "./HighlightedArea";
import { ImperativePanelGroupHandle, PanelGroup } from "react-resizable-panels";
import { Textarea } from "../ui/textarea";

type DisplayNotesSidebarExampleProps = {
	annotatedPdfId: string;
	loadedSource: string;
	userId: string;
	userHighlights: HighlightWithRelations[];
	annotatedPdfsWithProfile: AnnotatedPdfWithProfile[];
};

type Note = {
	id: number;
	content: string;
	highlightAreas: HighlightArea[];
	quote: string;
};

const ReadingViewer: React.FC<DisplayNotesSidebarExampleProps> = ({
	loadedSource,
	userHighlights,
	userId,
	annotatedPdfId,
	annotatedPdfsWithProfile,
}) => {
	const [notes, setNotes] = useState<Note[]>([]);
	const [friendHighlights, setFriendHighlights] = useState<Highlight[]>([]);

	const {
		currentHighlight,
		selectHighlight,
		createAskHighlight,
		clearSelectedHighlight,
		setCurrentHighlight,
	} = useAskHighlight();
	let noteId = notes.length;

	const utils = clientApi.useUtils();

	const annotatedPdfMutation =
		clientApi.annotatedPdf.resetHighlights.useMutation({
			onMutate: async () => {
				await utils.annotatedPdf.fetchAnnotatedPdf.cancel({
					userId: userId,
					source: loadedSource,
				});

				utils.annotatedPdf.fetchAnnotatedPdf.setData(
					{
						userId: userId,
						source: loadedSource,
					},
					(oldData) => {
						if (!oldData) return oldData;
						return {
							...oldData,
							highlights: [],
						};
					},
				);
			},
			onSuccess: (input) => {
				utils.annotatedPdf.fetchAnnotatedPdf.invalidate({
					userId: userId,
					source: loadedSource,
				});
			},
		});

	const deleteHighlightMutation =
		clientApi.highlight.deleteHighlight.useMutation({
			onMutate: async (newData) => {
				await utils.annotatedPdf.fetchAnnotatedPdf.cancel({
					userId: userId,
					source: loadedSource,
				});

				utils.annotatedPdf.fetchAnnotatedPdf.setData(
					{
						userId: userId,
						source: loadedSource,
					},
					(oldData) => {
						if (!oldData) return oldData;
						return {
							...oldData,
							highlights: highlights.filter(
								(highlight) => highlight.id != newData.highlightId,
							),
						};
					},
				);
			},
			onSuccess: (input) => {
				utils.annotatedPdf.fetchAnnotatedPdf.invalidate({
					userId: userId,
					source: loadedSource,
				});
			},
		});

	const editHighlightMutation = clientApi.comment.upsertComment.useMutation();

	const highlights =
		clientApi.annotatedPdf.fetchAnnotatedPdf.useQuery({
			userId: userId,
			source: loadedSource,
		}).data?.highlights || userHighlights;

	const deleteHighlight = (highlightId: string) => {
		deleteHighlightMutation.mutate({ highlightId });
	};

	const editHighlight = ({
		id,
		highlightId,
		text,
	}: {
		id?: string;
		highlightId: string;
		text: string;
	}) => {
		editHighlightMutation.mutate({ id, highlightId, text, userId });
	};

	const resetHighlights = () => {
		annotatedPdfMutation.mutate({
			id: annotatedPdfId,
		});
	};

	const inputRef = useRef<HTMLTextAreaElement | null>(null);

	const renderHighlightTarget = (props: RenderHighlightTargetProps) => {
		const saveHighlight = () => {
			const note: Note = {
				id: ++noteId,
				content: "",
				highlightAreas: props.highlightAreas,
				quote: props.selectedText,
			};
			setNotes(notes.concat([note]));
			const extendedNote: NewHighlightWithRelationsInput = {
				...note,
				annotatedPdfId,
			};
			console.log(extendedNote);
			createAskHighlight(extendedNote);
			props.cancel();
		};

		const askQuestion = async (prompt: string) => {
			const note: Note = {
				id: ++noteId,
				content: prompt, // this should be the initial question
				highlightAreas: props.highlightAreas,
				quote: props.selectedText,
			};
			setNotes(notes.concat([note]));
			const extendedNote: NewHighlightWithRelationsInput = {
				...note,
				annotatedPdfId,
				node: {
					prompt,
					response: null,
					timestamp: new Date(),
				},
			};
			return await createAskHighlight(extendedNote);
		};

		const submitQuestion = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter") {
				if (inputRef.current && inputRef.current.value !== "") {
					askQuestion(inputRef.current.value);
				}
			}
		};

		// maybe this can be used for flashcards?
		const define = async () => {
			const highlight = await askQuestion(
				"Concisely define the following term and why it is important." +
					props.selectedText,
			);
			console.log("define highlight", highlight);
			if (highlight) {
				setCurrentHighlight(highlight, true);
				//
			}
		};

		// guides the direction of the tree
		// TODO: revise the prompt
		const explain = async () => {
			const highlight = await askQuestion(
				"Concisely explain why this is important: " + props.selectedText,
			);
			console.log("explain", highlight);
			if (highlight) {
				setCurrentHighlight(highlight, true);
			}
		};

		return (
			<div
				className="relative flex space-x-2"
				style={{
					position: "absolute",
					left: `${props.selectionRegion.left + props.selectionRegion.width}%`,
					top: `${props.selectionRegion.top}%`,
					transform: "translate(0, 8px)",
					zIndex: 1,
				}}
			>
				<button
					onClick={saveHighlight}
					className="px-2 py-1 bg-blue-500 text-white rounded shadow-md focus:outline-none hover:bg-blue-600"
				>
					Save
				</button>
				<div className="group">
					<button className="px-2 py-1 bg-blue-500 text-white rounded shadow-md focus:outline-none hover:bg-blue-600">
						Ask
					</button>
					<div className="absolute w-48 bg-white rounded-md shadow-xl z-20 invisible group-hover:visible text-xs">
						<Textarea
							placeholder="Ask a question or @ someone"
							onKeyDown={submitQuestion}
							ref={inputRef}
						/>
						<button
							onClick={define}
							className="block px-4 py-2 text-gray-800 hover:bg-gray-100 w-full text-left group-hover:visible"
						>
							Define
						</button>
						<button
							onClick={explain}
							className="block px-4 py-2 text-gray-800 hover:bg-gray-100 w-full text-left group-hover:visible"
						>
							Summarize
						</button>
					</div>
				</div>
			</div>
		);
	};
	const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
	const setPDFViewerWidthPercentage = (pdfViewerWidth: number = 50) => {
		const panelGroup = panelGroupRef.current;
		if (panelGroup) {
			panelGroup.setLayout([pdfViewerWidth, 100 - pdfViewerWidth]);
		}
	};
	const renderHighlights = (props: RenderHighlightsProps) => {
		try {
			return (
				<div>
					{highlights.map((highlight) => {
						const filteredAreas = highlight.highlightAreas.filter(
							(area) => area.pageIndex === props.pageIndex && area.width > 0,
						);
						const rightmostArea = filteredAreas.reduce((maxArea, area) => {
							return area.left > (maxArea?.left ?? 0) ? area : maxArea;
						}, filteredAreas[0]);
						const topmostArea = filteredAreas.reduce((minArea, area) => {
							return area.top < (minArea?.top ?? 0) ? area : minArea;
						}, filteredAreas[0]);
						const bottommostArea = filteredAreas.reduce((maxArea, area) => {
							return area.top > (maxArea?.top ?? Number.MAX_VALUE)
								? area
								: maxArea;
						}, filteredAreas[0]);
						const middleHeight =
							topmostArea && bottommostArea
								? (topmostArea.top +
										bottommostArea.top +
										bottommostArea.height) /
									2
								: undefined;

						const openForest = () => {
							setCurrentHighlight(highlight);
							const panelGroup = panelGroupRef.current;
							if (panelGroup) {
								// Reset each Panel to 50% of the group's width
								setPDFViewerWidthPercentage(50);
							}
						};

						return (
							<div key={highlight.id} className="group z-10">
								{filteredAreas.map((area, idx) => {
									return (
										<HighlightedArea
											openForest={openForest}
											className="group-hover:bg-yellow-600 group-hover:bg-opacity-40 cursor-pointer"
											area={area}
											props={props}
											key={idx}
											idx={idx}
										/>
									);
								})}
								<PastNote
									highlight={highlight}
									middleHeight={middleHeight}
									rightmostArea={rightmostArea}
									editHighlight={editHighlight}
									deleteHighlight={deleteHighlight}
								/>
							</div>
						);
					})}
				</div>
			);
		} catch (error) {
			console.error("Error in renderHighlights:", error);
			// Render an error message or fallback UI
			return <div>An error occurred while rendering highlights.</div>;
		}
	};
	const highlightPluginInstance = highlightPlugin({
		renderHighlightTarget,
		// renderHighlightContent,
		renderHighlights,
	});

	const { jumpToHighlightArea } = highlightPluginInstance;

	const onHighlightClick = (highlight: HighlightWithRelations) => {
		const area = highlight.highlightAreas[0];
		if (area) {
			jumpToHighlightArea(area);
		}
		selectHighlight(highlight);
	};

	return (
		<div>
			<FloatingProfiles
				setDisplayHighlights={setFriendHighlights}
				allHighlightsWithProfile={annotatedPdfsWithProfile}
			/>

			<PanelGroup className="w-full" direction="horizontal" ref={panelGroupRef}>
				<ResizablePanel
					onClick={() => {
						setPDFViewerWidthPercentage(100);
					}}
					className="relative"
					defaultSize={80}
					style={{ height: "100vh", overflow: "auto" }}
				>
					<Viewer fileUrl={loadedSource} plugins={[highlightPluginInstance]} />
					{/* removes the trailing bottom whitespace */}
					<div />
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel style={{ height: "100vh", overflow: "auto" }}>
					{currentHighlight?.node ? (
						<ReactFlowProvider>
							<Forest
								node={currentHighlight.node}
								returnHome={() => {
									document.location.hash = "";
									clearSelectedHighlight();
								}}
							/>
						</ReactFlowProvider>
					) : (
						<div style={{ height: "100%", overflow: "auto" }}>
							<Sidebar
								highlights={highlights ?? []}
								deleteHighlight={deleteHighlight}
								resetHighlights={resetHighlights}
								onHighlightClick={onHighlightClick}
							/>
						</div>
					)}
				</ResizablePanel>
			</PanelGroup>
		</div>
	);
};

export default ReadingViewer;
