import { BaseModel, onDocChange, QueryBuilder } from "pocketto";
import { ModelStatic } from "pocketto/dist/src/definitions/Model";
import { useCallback, useEffect, useState } from "react";

export function useRealtimeList<T extends BaseModel>(type: ModelStatic<T>, config: {
    condition?: (query: QueryBuilder<T>) => QueryBuilder<T>;
    onItemChange?: (value: T | undefined) => void;
    onItemCreate?: (value: T | undefined) => void;
    onItemUpdate?: (value: T | undefined) => void;
    animationDelay?: number;
    order?: "asc" | "desc";
    orderBy?: keyof T;
    disableAutoAppend?: boolean;
} = {}) {
    const {
        condition = (query) => query.orderBy('createdAt', 'desc'),
        onItemChange,
        onItemCreate,
        onItemUpdate,
        animationDelay,
        order,
        orderBy,
        disableAutoAppend,
    } = config;
    const [data, setData] = useState<Array<T>>([]);

    const fetch = useCallback(async (builder: (query: QueryBuilder<T>) => QueryBuilder<T>) => {
        const query = builder(new type().getClass().query() as unknown as QueryBuilder<T>);
        const docs = await query.get() as Array<T>;
        setData(docs);
    }, []);

    useEffect(() => {
        if (condition) {
            fetch(condition);
        }
    }, [condition]);

    const [changedDoc, setChangedDoc] = useState<T>();
    useEffect(() => {
        const docChange = async (id: string) => {
            if (!(data instanceof Array)) return;
            const doc = await new type().getClass().query().find(id) as T;
            const sameModelType = new type().getClass().collectionName === doc.cName;
            if (!sameModelType) return;
            setChangedDoc(doc);
        };
        const event = onDocChange(docChange);
        return () => {
            event.off('docChange', docChange);
        };
    }, []);

    useEffect(() => {
        if (changedDoc) {
            setData((prev) => {
                const newData = [...prev];
                const sameIdIndex = newData.findIndex((d) => d.id === changedDoc.id);
                if (sameIdIndex !== -1) {
                    newData[sameIdIndex] = changedDoc;
                    onItemUpdate?.(changedDoc);
                    setTimeout(() => onItemUpdate?.(undefined), animationDelay || 1);
                } else if (!disableAutoAppend) {
                    if (!order || order === "desc") {
                        newData.unshift(changedDoc as T);
                    } else if (order === "asc") {
                        newData.push(changedDoc as T);
                    }

                    const sortBy = orderBy || 'createdAt';
                    newData.sort((a, b) => {
                        if (a[sortBy] > b[sortBy]) {
                            return order === "asc" ? 1 : -1;
                        }
                        if (a[sortBy] < b[sortBy]) {
                            return order === "asc" ? -1 : 1;
                        }
                        return 0;
                    });

                    onItemCreate?.(changedDoc);
                    setTimeout(() => onItemCreate?.(undefined), animationDelay || 1);
                }
                onItemChange?.(changedDoc);
                setTimeout(() => onItemChange?.(undefined), animationDelay || 1);
                return newData;
            });
        }
    }, [changedDoc])

    return data;
}
