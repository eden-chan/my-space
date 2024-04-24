import React, { useEffect, useState, useRef } from "react";
import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { HighlightComment } from "@prisma/client";
import { Input } from "@/components/ui/input";

const HighlightPopup = ({
	highlightId,
	comment,
	canEditComment,
	updateHighlightCommentText,
	deleteHighlight,
}: {
	highlightId: string;
	comment: HighlightComment | null;
	canEditComment: boolean;
	updateHighlightCommentText: Function;
	deleteHighlight: Function;
}) => {
	const [inputText, setInputText] = useState(comment?.text ?? "hi");
	const [isEditing, setIsEditing] = useState(false);
	const [updatedComment, setUpdatedComment] = useState(comment?.text ?? "hi");

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			updateHighlightCommentText(highlightId, inputText);
			setUpdatedComment(inputText);
			setIsEditing(false);
		}
	};

	return comment?.text ? (
		<div className="Highlight__popup">
			{isEditing && canEditComment ? (
				<Input
					className="text-white bg-slate-600"
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					onKeyDown={handleKeyDown}
				></Input>
			) : (
				<>
					<p>
						{comment.emoji} {updatedComment}
					</p>
					{canEditComment && (
						<div className="flex justify-end">
							<Pencil1Icon
								className="m-1 cursor-pointer"
								onClick={() => setIsEditing(true)}
							/>
							<TrashIcon
								className="m-1 cursor-pointer"
								onClick={() => deleteHighlight(highlightId)}
							/>
						</div>
					)}
				</>
			)}
		</div>
	) : null;
};

export default HighlightPopup;
