"use client";
import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import TipTapMenuBar from "./TipTapMenuBar";
import { Button } from "./ui/button";
import { useDebounce } from "@/lib/useDebounce";
import { useMutation } from "@tanstack/react-query";
import Text from "@tiptap/extension-text";
import axios from "axios";
import { NoteType } from "@/lib/db/schema";
import { useCompletion } from "ai/react";
import { Loader2 } from "lucide-react";

type Props = { note: NoteType };


const TipTapEditor = ({ note }: Props) => {
  const [isAutocomplete, setIsAutocomplete] = React.useState(false);
  const [editorState, setEditorState] = React.useState(
    note.editorState || `<span>${note.name}....</span>`
  );
  const [globalPrompt, setGlobalPrompt] = React.useState("");
  const { complete, completion } = useCompletion({
   api : "/api",
   
  });
  const saveNote = useMutation({
    mutationFn: async () => {
      const response = await axios.post("/api/saveNote", {
        noteId: note.id,
        editorState,
      });
      return response.data;
    },
  });
  const customText = Text.extend({
    addKeyboardShortcuts() {
      return {
        "Shift-A": () => {
          const prompt = this.editor.getText().split(" ").slice(-30).join(" ");
          console.log("prompt", prompt);
          complete(prompt);
          AutocompleteText(prompt);
          
          return true;
        },
      };
    },
  });


  const AutocompleteText=async (input:string)=>{
    if (isAutocomplete) {
      setIsAutocomplete(true);
      await complete(input);
    }
  }
  const editor = useEditor({
    autofocus: true,
    extensions: [StarterKit, customText],
    content: editorState,
    onUpdate: ({ editor }) => {
      setEditorState(editor.getHTML());
    },
  });
  const lastCompletion = React.useRef("");

  React.useEffect(() => {
    if (!completion || !editor) return;
    const diff = completion.slice(lastCompletion.current.length);
    lastCompletion.current = completion;
    editor.commands.insertContent(diff);
  }, [completion, editor]);

  const debouncedEditorState = useDebounce(editorState, 500);
  React.useEffect(() => {
    // save to db
    if (debouncedEditorState === "") return;
    saveNote.mutate(undefined, {
      onSuccess: (data) => {
        console.log("success update!", data);
      },
      onError: (err) => {
        console.error(err);
      },
    });
  }, [debouncedEditorState]);
  return (
    <>
      <div className="flex">
        {editor && <TipTapMenuBar editor={editor} />}
        <Button disabled variant={"outline"}>
          {saveNote.isLoading ?   (<Loader2 className="w-6 h-6 animate-spin" />) : 
         'Saved'
          }
        </Button>
      </div>

      <div className="prose prose-sm w-full mt-4">
        <EditorContent editor={editor} />
      </div>
      <div className="h-4"></div>
      <span className="text-sm">
        Tip: Press{" "}
        <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
          Shift + A
        </kbd>{" "}
        for AI autocomplete
      </span>
     <div className="flex flex-row gap-x-1  justify-start mt-4 items-center">
     <Button disabled>
        <a href={`/api/download/${note.id}`} >Download</a>
      </Button>
      <Button onClick={() => setIsAutocomplete(true)} variant="outline" disabled>
        Autocomplete
      </Button>
     </div>
    </>
  );
};

export default TipTapEditor;