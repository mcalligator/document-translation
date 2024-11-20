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
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    columnDefinitions.reduce(
      (acc, col) => ({
        ...acc,
        [col.name]: col.minWidth || 150,
      }),
      {}
    )
  );
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  
  const tableRef = useRef<HTMLTableElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleResizeStart = (e: MouseEvent, field: string) => {
    e.preventDefault();
    setResizingColumn(field);
    startXRef.current = e.pageX;
    startWidthRef.current = columnWidths[field];
  };

  const handleResizing = useCallback(
    (e: ListenerMouseEvent) => {
      // e received actually of type MouseEvent, but extended Event type required for adding & removing listeners
      if (!resizingColumn) return;

      const diff = e.pageX - startXRef.current;
      // Constrain newWidth to between minWidth and maxWidth for the column being resized
      const newWidth = Math.min(
        Math.max(
          columnDefinitions.find((col) => col.name === resizingColumn)?.minWidth || 150,
          startWidthRef.current + diff
        ),
        columnDefinitions.find((col) => col.name === resizingColumn)?.maxWidth || 400
      );
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    },
    [resizingColumn, columnDefinitions]
  );

  const handleInputResize = (field: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [field]: width,
    }));
  };

  const handleResizeEnd = useCallback(() => {
    setResizingColumn(null);
  }, []);

  useEffect(() => {
    if (resizingColumn) {
      window.addEventListener("mousemove", handleResizing);
      window.addEventListener("mouseup", handleResizeEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleResizing);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [resizingColumn, handleResizing, handleResizeEnd]);

  interface HeadingDetails {
    text: string;
    minWidth: number;
    colRef: RefObject<HTMLTableCellElement>;
  }

  return (
    <>
      <table ref={tableRef} className="admin">
        <thead>
          <tr>
            {columnDefinitions.map(({ name, title }) => (
              <th key={name}>
                <span>{title}</span>
                <div
                  className={`resize-handle ${resizingColumn === name ? "active" : "hover"}`}
                  style={{ height: "100%" }}
                  onMouseDown={(e) => handleResizeStart(e, name)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user: UserData) => {
            return (
              <tr key={user.id}>
                <UserRow
                  user={user}
                  updateUserSetWithChanges={updateUserSetWithChanges}
                  deleteToggleChanges={deleteToggleChanges}
                  reportStatus={reportStatus}
                  fields={columnDefinitions}
                  columnWidths={columnWidths}
                  onInputResize={handleInputResize}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
