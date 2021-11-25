import React, { useCallback, useMemo, useState } from "react";
import isHotkey from "is-hotkey";
import { Editable, withReact, useSlate, Slate } from "slate-react";
import {
  Editor,
  Transforms,
  createEditor,
  Descendant,
  Element as SlateElement
} from "slate";
import { withHistory } from "slate-history";
import escapeHtml from "escape-html";
import { Text } from "slate";
import { TwitterPicker } from "react-color";

import { Button, Icon, Toolbar } from "./Components";

const HOTKEYS = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline",
  "mod+`": "code"
};

// type CustomElement = { type: "paragraph"; children: CustomText[] };
// type CustomText = { text: string };
// declare module "slate" {
//   interface CustomTypes {
//     Editor: BaseEditor & ReactEditor;
//     Element: CustomElement;
//     Text: CustomText;
//   }
// }

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor, format) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Editor.nodes(editor, {
    at: Editor.unhangRange(editor, selection),
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format
  });

  return !!match;
};

const LIST_TYPES = ["numbered-list", "bulleted-list"];

const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type),
    split: true
  });
  const newProperties = {
    type: isActive ? "paragraph" : isList ? "list-item" : format
  };
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const ColorPicker = () => {
  const [showPicker, setShowPicker] = useState(false);
  const editor = useSlate();

  const [color, setColor] = useState("#000");
  const pickColor = (color) => {
    const { selection } = editor;
    if (!selection) return false;
    Transforms.setNodes(
      editor,
      { color: color.hex },
      // Apply it to text nodes, and split the text node up if the
      // selection is overlapping only part of it.
      { match: (n) => Text.isText(n), split: true }
    );
    setColor(color.hex);
    setShowPicker(false);
  };

  return (
    <>
      <Button
        active={showPicker}
        onMouseDown={(event) => {
          event.preventDefault();
          setShowPicker(true);
        }}
      >
        <Icon>palette</Icon>
      </Button>
      {showPicker && (
        <div style={{ position: "absolute", zIndex: 2 }}>
          <div style={{ position: "fixed", top: 20 }}>
            <TwitterPicker color={color} onChange={pickColor} />
          </div>
        </div>
      )}
    </>
  );
};

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case "block-quote":
      return <blockquote {...attributes}>{children}</blockquote>;
    case "bulleted-list":
      return <ul {...attributes}>{children}</ul>;
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "numbered-list":
      return <ol {...attributes}>{children}</ol>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.color) {
    children = <span style={{ color: leaf.color }}>{children}</span>;
  }

  return <span {...attributes}>{children}</span>;
};

const BlockButton = ({ format, icon }) => {
  const editor = useSlate();
  return (
    <Button
      active={isBlockActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  );
};

const MarkButton = ({ format, icon }) => {
  const editor = useSlate();

  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  );
};

const initialValue = [
  {
    type: "heading-one",
    children: [
      {
        text: "Hello",
        color: "#0693e3"
      },
      {
        text: " "
      },
      {
        text: "KD",
        color: "#ff6900"
      },
      {
        text: " "
      },
      {
        text: "2417",
        color: "#9900ef"
      },
      {
        text: "!"
      }
    ]
  },
  {
    type: "paragraph",
    children: [
      {
        text: "You can write "
      },
      {
        text: "bold",
        bold: true
      },
      {
        text: " and "
      },
      {
        text: "italic",
        italic: true
      },
      {
        text: " also "
      },
      {
        text: "colorful ",
        color: "#eb144c"
      },
      {
        text: "text in "
      },
      {
        text: "alliance",
        color: "#0693e3"
      },
      {
        text: " mail easily using this tool!"
      }
    ]
  },
  {
    type: "paragraph",
    children: [
      {
        text: "Created by:"
      }
    ]
  },
  {
    type: "heading-two",
    children: [
      {
        text: "Raiku",
        color: "#9900ef"
      }
    ]
  }
];

const serialize = (node) => {
  if (Text.isText(node)) {
    let string = escapeHtml(node.text);
    if (node.bold) {
      string = `<b>${string}</b>`;
    }
    if (node.italic) {
      string = `<i>${string}</i>`;
    }
    if (node.color) {
      string = `<color=${node.color}>${string}</color>`;
    }
    return `${string}`;
  }

  const children = node.children.map((n) => serialize(n)).join("");
  switch (node.type) {
    case "heading-one":
      return `<size=40>${children}</size>\n`;
    case "heading-two":
      return `<size=20>${children}</size>\n`;
    default:
      return `${children}\n`;
  }
};

const RichTextExample = () => {
  const [value, setValue] = useState<Descendant[]>(initialValue);
  const renderElement = useCallback((props) => <Element {...props} />, []);
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  return (
    <div>
      <h1>Rise of Kingdoms - Mail tool</h1>
      <Slate
        editor={editor}
        value={value}
        onChange={(value) => setValue(value)}
      >
        <Toolbar>
          <MarkButton format="bold" icon="format_bold" />
          <MarkButton format="italic" icon="format_italic" />

          <BlockButton format="heading-one" icon="looks_one" />
          <BlockButton format="heading-two" icon="looks_two" />

          <ColorPicker />
        </Toolbar>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Enter some rich text…"
          spellCheck
          autoFocus
          onKeyDown={(event) => {
            for (const hotkey in HOTKEYS) {
              if (isHotkey(hotkey)(event)) {
                event.preventDefault();
                const mark = HOTKEYS[hotkey];
                toggleMark(editor, mark);
              }
            }
          }}
        />
      </Slate>

      <hr />
      <h3>Copy mail code:</h3>
      <textarea
        rows={10}
        style={{
          border: "1px solid black",
          padding: 20,
          marginTop: 20,
          width: "100%",
          borderRadius: 10
        }}
      >
        {`${value?.map((v) => serialize(v)).join("")}`}
      </textarea>
    </div>
  );
};

export default RichTextExample;
