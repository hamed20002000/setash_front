// src/views/works/WorkDetailsTable.tsx
import React, { useState } from 'react';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Box, IconButton, TablePagination, Collapse, Stack // Stack برای نمایش افقی آیتم‌ها
} from '@mui/material';
import {
    IconCirclePlus, IconCircleMinus, // برای لایه اول: TR ADI
    IconChevronRight, IconChevronDown // برای لایه دوم: D.N و مقادیر
} from '@tabler/icons-react';

// WorkItemDetail باید از WorkDetails.tsx ایمپورت شود
import { WorkItemDetail } from './WorkDetails'; // مسیر را بر اساس ساختار پروژه خود تنظیم کنید



// Direkler
// İşler
// İşleri Listele

// Şebekeler
// Şebekeleri Görüntüle


// رابط کاربری برای ردیف‌های اصلی (TR ADI)
interface WorkDetailRow {
    id: string; // ID منحصر به فرد برای هر ردیف ثبت شده (TR ADI)
    trAdi: string;
    // itemDetails را اینجا از WorkDetailRow حذف می کنیم، چون در لایه دوم نمایش داده می شوند
    // حالا itemDetails به صورت یک آرایه از SubEntry ها (WorkDetailSubEntry) خواهد بود
    subEntries: WorkDetailSubEntry[]; // ✅ زیرمجموعه های TR ADI
}

// رابط کاربری برای زیرمجموعه های D.N, YENİ, DMM, MEVCUT
interface WorkDetailSubEntry {
    id: string; // ID منحصر به فرد برای هر ساب-ردیف
    trAdiParentId: string; // ID والد (TR ADI)
    dn: string;
    yeni: string;
    dmm: string;
    mevcut: string;
    itemDetails: WorkItemDetail[]; // آیتم های جزئی مربوط به این ساب-ردیف
}

// Props برای کامپوننت جدول اصلی
interface WorkDetailsTableProps {
    registeredWorkEntries: WorkDetailRow[]; // حالا یک آرایه از WorkDetailRow ها
}

// -----------------------------------------------------------------------------
// Component for the second layer (Sub-entries for each TR ADI)
// -----------------------------------------------------------------------------
interface SubEntryRowProps {
    subEntry: WorkDetailSubEntry;
}

const SubEntryRow: React.FC<SubEntryRowProps> = ({ subEntry }) => {
    // State برای مدیریت باز/بسته بودن ردیف‌های لایه دوم (آیتم‌های جزئی)
    const [isSubExpanded, setIsSubExpanded] = useState(false);

    return (
        <React.Fragment>
            <TableRow sx={{ '&:last-child td': { border: 0 }, backgroundColor: '#f9f9f9' }}> {/* کمی رنگ پس‌زمینه متفاوت */}
                <TableCell style={{ width: '50px' }}>
                    {subEntry.itemDetails && subEntry.itemDetails.length > 0 && (
                        <IconButton size="small" onClick={() => setIsSubExpanded(!isSubExpanded)}>
                            {isSubExpanded ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell><Typography variant="body2">{subEntry.dn}</Typography></TableCell>
                <TableCell><Typography variant="body2">{subEntry.yeni}</Typography></TableCell>
                <TableCell><Typography variant="body2">{subEntry.dmm}</Typography></TableCell>
                <TableCell><Typography variant="body2">{subEntry.mevcut}</Typography></TableCell>
            </TableRow>
            {/* Collapse row for itemDetails (third layer) */}
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}> {/* colSpan باید برابر با تعداد ستون‌های لایه دوم باشد */}
                    <Collapse in={isSubExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{
                            margin: 1,
                            ml: 4, // Indent for third layer
                            borderLeft: '2px solid #a7d9f7', // Light blue line
                            pl: 2,
                            pb: 1,
                            backgroundColor: '#ffffff', // Beyaz veya çok açık bir renk
                            borderRadius: '4px',
                        }}>
                            <Typography variant="caption" gutterBottom component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                                Alt Öğeler:
                            </Typography>
                            {subEntry.itemDetails && subEntry.itemDetails.length > 0 ? (
                                <Stack direction="column" spacing={0.5} sx={{ pl: 2, pb: 1 }}> {/* نمایش آیتم‌ها به صورت عمودی با فاصله کم */}
                                    {subEntry.itemDetails.map((itemDetail, idx) => (
                                        <Typography key={itemDetail.tempId || idx} variant="body2">
                                            - **{itemDetail.name}:** {itemDetail.value}
                                        </Typography>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ ml: 1, pb: 1 }}>
                                    Hiç alt öğe eklenmedi.
                                </Typography>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};


// -----------------------------------------------------------------------------
// Main WorkDetailsTable Component
// -----------------------------------------------------------------------------
const WorkDetailsTable: React.FC<WorkDetailsTableProps> = ({ registeredWorkEntries }) => {
    // State to manage which TR ADI row is expanded.
    const [expandedTrAdiId, setExpandedTrAdiId] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const toggleExpandTrAdi = (trAdiId: string) => {
        setExpandedTrAdiId(expandedTrAdiId === trAdiId ? null : trAdiId);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        console.log(event)
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedEntries = registeredWorkEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader aria-label="work details table">
                <TableHead style={{ background: "#f1f1f1" }}>
                    <TableRow>
                        <TableCell style={{ width: '50px' }}></TableCell> {/* Column for TR ADI expand icon */}
                        <TableCell><Typography variant="h6" color="#171c23">TR ADI</Typography></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedEntries.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={2} align="center"> {/* colSpan for main table */}
                                <Typography variant="subtitle1" color="textSecondary">
                                    Henüz kayıtlı iş detayı bulunamadı.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedEntries.map((trAdiRow) => (
                            <React.Fragment key={trAdiRow.id}>
                                {/* First Layer: TR ADI */}
                                <TableRow sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell>
                                        {trAdiRow.subEntries && trAdiRow.subEntries.length > 0 && (
                                            <IconButton size="small" onClick={() => toggleExpandTrAdi(trAdiRow.id)}>
                                                {expandedTrAdiId === trAdiRow.id ? <IconCircleMinus size={20} /> : <IconCirclePlus size={20} />}
                                            </IconButton>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{trAdiRow.trAdi}</Typography>
                                    </TableCell>
                                </TableRow>

                                {/* Second Layer: Collapsible table for sub-entries (D.N, YENİ, DMM, MEVCUT) */}
                                <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={2}> {/* colSpan for main table */}
                                        <Collapse in={expandedTrAdiId === trAdiRow.id} timeout="auto" unmountOnExit>
                                            <Box sx={{
                                                margin: 1,
                                                ml: 4, // Indent for second layer
                                                borderLeft: '2px solid #ccc', // Grey line
                                                pl: 2,
                                                pb: 1,
                                                backgroundColor: '#efefef', // Açık gri arka plan
                                                borderRadius: '4px',
                                            }}>
                                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                                                    Alt İş Detayları:
                                                </Typography>
                                                {trAdiRow.subEntries && trAdiRow.subEntries.length > 0 ? (
                                                    <Table size="small" aria-label="sub work details table" sx={{ width: '100%' }}>
                                                        <TableHead>
                                                            <TableRow sx={{ backgroundColor: '#e0e0e0' }}> {/* Koyu gri header */}
                                                                <TableCell style={{ width: '50px' }}></TableCell> {/* For sub-entry expand icon */}
                                                                <TableCell sx={{ fontWeight: 'bold' }}>D.N</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>YENİ</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>DMM</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>MEVCUT</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {trAdiRow.subEntries.map((subEntry) => (
                                                                <SubEntryRow key={subEntry.id} subEntry={subEntry} />
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <Typography variant="body2" color="textSecondary" sx={{ ml: 1, pb: 1 }}>
                                                        Bu TR ADI için alt iş detayı eklenmedi.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))
                    )}
                </TableBody>
            </Table>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={registeredWorkEntries.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />
        </TableContainer>
    );
};

export default WorkDetailsTable;