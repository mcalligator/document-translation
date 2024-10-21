import "./adminStyles.css";
import "@cloudscape-design/global-styles/index.css";

import React, { MouseEvent, RefObject, useCallback, useEffect, useRef, useState } from "react";

import { ColumnDefinition, ListenerMouseEvent, UserData } from "./util/typeExtensions.js";

import UserRow from "./userRow";

interface UserTableProps {
  columnDefinitions: ColumnDefinition[];
  users: UserData[];
  updateUserSetWithChanges: Function;
  deleteToggleChanges: Function;
  reportStatus: Function;
}

export default function UserTable({
  columnDefinitions,
  users,
  updateUserSetWithChanges,
  deleteToggleChanges,
  reportStatus,
}: UserTableProps) {
  const [tableHeight, setTableHeight] = useState<number | "auto">("auto");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tableElement = useRef<HTMLTableElement>(null);

  interface HeadingDetails {
    text: string;
    minWidth: number;
    colRef: RefObject<HTMLTableCellElement>;
  }

  const createHeadingRefs = (headings: ColumnDefinition[]): HeadingDetails[] => {
    return headings.map((heading) => ({
      text: heading.title,
      minWidth: heading.minWidth,
      colRef: useRef<HTMLTableCellElement>(null),
    }));
  };

  const columnSet = createHeadingRefs(columnDefinitions);
  // for (const col of columns) {
  //   console.log(`Column ${col.text} has width ${col.columnWidth}`);
  // }

  // console.table(users);

  useEffect(() => {
    setTableHeight(tableElement!.current!.offsetHeight);
  }, []);

  const mouseUp = () => {
    setActiveIndex(null);
    removeListeners();
  };

  // The mouseMove listener is only active AFTER the mouseDown event; it is removed with mouseUp.
  const mouseMove = useCallback(
    (e: ListenerMouseEvent) => {
      // e received actually of type MouseEvent, but extended Event type required for adding & removing listeners
      const gridColumns: string[] = columnSet.map((col: HeadingDetails, i) => {
        if (i === activeIndex) {
          const currentWidth = col.colRef.current!.offsetWidth;
          const absLeft = e.clientX - currentWidth;
          const newWidth = currentWidth + e.movementX;
          // console.log(
          //   `    ClientX: ${e.clientX} | offsetWidth: ${col.colRef.current!.offsetWidth} | absLeft: ${absLeft} | movementX: ${e.movementX} | newWidth: ${newWidth}`
          // );
          if (newWidth >= col.minWidth) {
            // console.log(` --- Column width set to ${newWidth}`);
            return `${newWidth}px`;
          } else {
            // console.log(`*** Mininum column width of ${col.minWidth} reached ***`);
          }
        }
        return `${col.colRef.current!.offsetWidth}px`;
      });
      const columnDefs = `${gridColumns.join(" ")}`;
      // console.log(`Column Widths: ${columnDefs}`);
      tableElement!.current!.style.gridTemplateColumns = columnDefs;
    },
    [activeIndex, columnSet]
  );

  const removeListeners = useCallback(() => {
    removeEventListener("mousemove", mouseMove);
    removeEventListener("mouseup", mouseUp);
  }, [mouseMove]);

  useEffect(() => {
    if (activeIndex !== null) {
      addEventListener("mousemove", mouseMove);
      addEventListener("mouseup", mouseUp);
    }

    return () => {
      removeListeners();
    };
  }, [activeIndex, mouseMove, mouseUp, removeListeners]);

  const mouseDown = (e: MouseEvent, index: number) => {
    // console.log(`MouseDown at ${e.clientX}`);
    setActiveIndex(index);
  };

  return (
    <>
      <table ref={tableElement} className="admin">
        <thead>
          <tr>
            {columnSet.map(({ colRef: ref, text }, i) => (
              <th ref={ref} key={text}>
                <span>{text}</span>
                <div
                  style={{
                    height: tableHeight,
                  }}
                  onMouseDown={(e: MouseEvent) => mouseDown(e, i)}
                  className={`resize-handle ${activeIndex === i ? "active" : "hover"}`}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user: UserData) => {
            // console.log(
            //   "User: " + user.firstName + " ID: " + user.id + " Index: " + index
            // );
            return (
              <tr key={user.id}>
                <UserRow
                  user={user}
                  updateUserSetWithChanges={updateUserSetWithChanges}
                  deleteToggleChanges={deleteToggleChanges}
                  reportStatus={reportStatus}
                  columns={columnDefinitions}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
