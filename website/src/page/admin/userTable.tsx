import "./adminStyles.css";
import "@cloudscape-design/global-styles/index.css";

import React, {
  MouseEvent,
  MouseEventHandler,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { UserData } from "../../util/typeExtensions.js";

import UserRow from "./userRow";

interface UserTableProps {
  headings: string[];
  minCellWidth: number;
  users: UserData[];
  updateUserSetWithChanges: Function;
  deleteToggleChanges: Function;
  reportStatus: Function;
}

export default function UserTable({
  headings,
  minCellWidth,
  users,
  updateUserSetWithChanges,
  deleteToggleChanges,
  reportStatus,
}: UserTableProps) {
  const [tableHeight, setTableHeight] = useState<number | "auto">("auto");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tableElement = useRef<HTMLTableElement>(null);

  interface Header {
    text: string;
    colRef: RefObject<HTMLTableCellElement>;
  }

  const createHeaders = (headers: string[]): Header[] => {
    return headers.map((item) => ({
      text: item,
      colRef: useRef<HTMLTableCellElement>(null),
    }));
  };

  const columns = createHeaders(headings);

  useEffect(() => {
    setTableHeight(tableElement!.current!.offsetHeight);
  }, []);

  const mouseUp = () => {
    setActiveIndex(null);
    removeListeners();
  };

  const mouseMove = useCallback(
    (e: Event) => {
      // e actually of type MouseMove, but broader Event type required for adding / removing listeners
      const gridColumns: string[] = columns.map((col: Header, i) => {
        if (i === activeIndex) {
          const widthAdjustment = 54; //Workaround for strange sudden increase in column width when changed
          const width =
            e.clientX - col.colRef.current!.offsetLeft - widthAdjustment;
          // console.log(
          //   `    ClientX: ${e.clientX} | offsetLeft: ${col.colRef.current!.offsetLeft} | offsetWidth: ${col.colRef.current!.offsetWidth} | Width: ${width}`
          // );
          if (width >= minCellWidth) {
            return `${width}px`;
          }
        }
        return `${col.colRef.current!.offsetWidth}px`;
      });
      const columnDefs = `${gridColumns.join(" ")}`;
      console.log(`Column Widths: ${columnDefs}`);
      tableElement!.current!.style.gridTemplateColumns = columnDefs;
      // tableElement!.current!.style.gridTemplateColumns = `${gridColumns.join(" ")}`;
    },
    [activeIndex, columns, minCellWidth]
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
    console.log(`MouseDown at ${e.clientX}`);
    setActiveIndex(index);
  };

  return (
    <>
      <table ref={tableElement} className="admin">
        <thead>
          <tr>
            {columns.map(({ colRef: ref, text }, i) => (
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
          {users.map((user: UserData, index: number) => {
            // console.log(
            //   "User: " + user.firstName + " ID: " + user.id + " Index: " + index
            // );
            return (
              <tr key={index}>
                <UserRow
                  user={user}
                  updateUserSetWithChanges={updateUserSetWithChanges}
                  deleteToggleChanges={deleteToggleChanges}
                  reportStatus={reportStatus}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
